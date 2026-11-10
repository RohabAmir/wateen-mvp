#!/usr/bin/env bash
# End-to-end smoke test of the core loop through the REST API:
# POS sales -> smart reorder -> approval -> supplier confirm and ship -> receiving -> stock count -> RFQ -> reports.
# Usage: BASE=http://localhost:3000 ./scripts/smoke.sh   (run against a freshly seeded database)
set -euo pipefail
BASE="${BASE:-http://localhost:3000}"
API="$BASE/api/v1"

need() { command -v "$1" >/dev/null || { echo "missing $1"; exit 1; }; }
need curl; need node

j() { node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const o=JSON.parse(s);const v=$1;if(v===undefined){console.error('Unexpected response:',s);process.exit(1)}console.log(typeof v==='object'?JSON.stringify(v):v)})"; }
call() { local method=$1 path=$2 token=$3 data=${4:-}; curl -sS -X "$method" "$API$path" -H "content-type: application/json" ${token:+-H "authorization: Bearer $token"} ${data:+-d "$data"}; }
login() { call POST /auth/demo-login "" "{\"email\":\"$1\"}" | j 'o.data.token'; }
step() { printf '\n\033[1m== %s\033[0m\n' "$1"; }
expect() { if [ "$1" != "$2" ]; then echo "FAILED: expected '$2', got '$1'"; exit 1; fi; echo "ok: $3"; }

step "Health"
expect "$(call GET /health "" | j 'o.data.status')" "ok" "API and database are up"

NOURA=$(login noura@alnakheel.sa)
KHALID=$(login khalid@alnakheel.sa)
SAAD=$(login saad@freshfarms.sa)
HASSAN=$(login hassan@gulfseafood.sa)
FAISAL=$(login faisal@alnakheel.sa)
OLY=$(call GET /me "$NOURA" | j 'o.data.branchId')

step "Feature 1: POS sales deduct recipe ingredients from stock"
BEFORE=$(call GET "/stock?branchId=$OLY" "$NOURA" | j 'o.data.find(r=>r.sku==="CHK").onHand')
echo "chicken on hand before: $BEFORE kg"
SALE=$(call POST /sales "$NOURA" "{\"branchId\":\"$OLY\",\"sample\":true}")
echo "$SALE" | j '"revenue SAR "+o.data.revenue+", recipe cost SAR "+o.data.cost'
expect "$(echo "$SALE" | j 'o.data.lowItems.some(i=>i.name==="Chicken breast")')" "true" "chicken crossed its reorder point"
AFTER=$(call GET "/stock?branchId=$OLY" "$NOURA" | j 'o.data.find(r=>r.sku==="CHK").onHand')
echo "chicken on hand after: $AFTER kg"
echo "unknown menu codes are rejected:"; call POST /sales "$NOURA" "{\"branchId\":\"$OLY\",\"lines\":[{\"code\":\"X99\",\"qty\":3}]}" | j 'o.error.message'
echo "managers cannot touch another branch:"
MLQ=$(call GET /me "$FAISAL" | j 'o.data.branchIds.find(b=>b!=="'"$OLY"'")')
expect "$(call POST /sales "$NOURA" "{\"branchId\":\"$MLQ\",\"sample\":true}" | j 'o.error.status')" "403" "branch access enforced"

step "Feature 2: smart reorder suggestion becomes a purchase order"
GROUP=$(call GET "/suggestions?branchId=$OLY" "$NOURA" | j 'o.data.find(g=>g.lines.some(l=>l.name==="Chicken breast"))')
SUPPLIER=$(echo "$GROUP" | j 'o.supplier.id')
LINES=$(echo "$GROUP" | j 'o.lines.map(l=>({itemId:l.itemId,qty:l.qty}))')
echo "$GROUP" | j '"suggested from "+o.supplier.name+": "+o.lines.map(l=>l.name+" "+l.qty+" "+l.unit).join(", ")'
PO=$(call POST /purchase-orders "$NOURA" "{\"branchId\":\"$OLY\",\"supplierId\":\"$SUPPLIER\",\"source\":\"SUGGESTION\",\"lines\":$LINES}")
POID=$(echo "$PO" | j 'o.data.id')
expect "$(echo "$PO" | j 'o.data.status')" "SENT" "order within the SAR 5,000 limit goes straight to the supplier"

step "Approval workflow for orders above the limit"
PENDING=$(call GET "/purchase-orders?status=PENDING_APPROVAL" "$KHALID" | j 'o.data[0].id')
expect "$(call POST "/purchase-orders/$PENDING/actions" "$NOURA" '{"action":"APPROVE"}' | j 'o.error.status')" "409" "branch managers cannot approve"
expect "$(call POST "/purchase-orders/$PENDING/actions" "$KHALID" '{"action":"REJECT"}' | j 'o.error.status')" "422" "rejecting needs a reason"
expect "$(call POST "/purchase-orders/$PENDING/actions" "$KHALID" '{"action":"APPROVE","note":"OK for the weekend"}' | j 'o.data.status')" "SENT" "purchasing approves and the order is sent"

step "Feature 3: supplier portal confirms and ships"
expect "$(call GET "/purchase-orders/$PENDING" "$SAAD" | j 'o.error.status')" "404" "suppliers cannot see other suppliers' orders"
expect "$(call POST "/purchase-orders/$POID/actions" "$SAAD" '{"action":"SHIP"}' | j 'o.error.status')" "409" "cannot ship before confirming"
expect "$(call POST "/purchase-orders/$POID/actions" "$SAAD" '{"action":"CONFIRM"}' | j 'o.data.status')" "CONFIRMED" "supplier confirms"
expect "$(call POST "/purchase-orders/$POID/actions" "$SAAD" '{"action":"SHIP"}' | j 'o.data.status')" "SHIPPED" "supplier ships"

step "Receiving flags a short delivery and a price increase"
RLINES=$(call GET "/purchase-orders/$POID" "$NOURA" | j 'o.data.lines.map((l,i)=>({lineId:l.id,receivedQty:i===0?Math.round(l.qty*0.9):l.qty,receivedPrice:i===0?+(l.unitPrice*1.05).toFixed(2):l.unitPrice}))')
REC=$(call POST "/purchase-orders/$POID/receive" "$NOURA" "{\"lines\":$RLINES}")
echo "$REC" | j 'o.data.flags.filter(f=>f.short||f.priceUp).map(f=>f.name+(f.short?" short "+(-f.qtyDiff):"")+(f.priceUp?" price +"+f.priceDiff:"")).join("; ")'
expect "$(echo "$REC" | j 'o.data.flags[0].short && o.data.flags[0].priceUp')" "true" "variances flagged"
expect "$(call GET "/purchase-orders/$POID" "$NOURA" | j 'o.data.status')" "RECEIVED" "order closed as received"
echo "chicken on hand after receipt: $(call GET "/stock?branchId=$OLY" "$NOURA" | j 'o.data.find(r=>r.sku==="CHK").onHand') kg"

step "Stock count finds unexplained loss"
COUNT=$(call POST /counts "$NOURA" "{\"branchId\":\"$OLY\"}")
CID=$(echo "$COUNT" | j 'o.data.id')
ENTRIES=$(echo "$COUNT" | j 'Object.fromEntries(o.data.lines.filter(l=>["CHK","LMB","TOM"].includes(l.item.sku)).map(l=>[l.id,+(l.item.sku==="CHK"?l.expectedQty-6:l.expectedQty).toFixed(2)]))')
POSTED=$(call POST "/counts/$CID/post" "$NOURA" "{\"entries\":$ENTRIES}")
expect "$(echo "$POSTED" | j 'o.data.lossValue > 100')" "true" "6 kg of chicken missing is recorded as a loss"

step "RFQ: a supplier quotes and purchasing awards the best price"
RFQ=$(call GET /rfqs "$KHALID" | j 'o.data.find(r=>r.status==="OPEN").id')
call POST "/rfqs/$RFQ/quotes" "$HASSAN" '{"unitPrice":69.5,"leadTimeDays":2,"note":"Matched for 30 days"}' | j '"Gulf Seafood quoted SAR "+o.data.unitPrice'
BEST=$(call GET /rfqs "$KHALID" | j 'o.data.find(r=>r.id==="'"$RFQ"'").quotes.sort((a,b)=>a.unitPrice-b.unitPrice)[0].id')
AWARD=$(call POST "/rfqs/$RFQ/award" "$KHALID" "{\"quoteId\":\"$BEST\"}")
expect "$(echo "$AWARD" | j 'o.data.source')" "RFQ" "award raises a purchase order at the quoted price"
expect "$(call POST "/rfqs/$RFQ/award" "$KHALID" "{\"quoteId\":\"$BEST\"}" | j 'o.error.status')" "400" "an RFQ can only be awarded once"

step "Reports and insights"
call GET "/reports/summary?days=30" "$FAISAL" | j '"revenue SAR "+o.data.summary.revenue+", food cost "+o.data.summary.theoreticalPct+"% theoretical vs "+o.data.summary.actualPct+"% actual"'
call GET /insights "$FAISAL" | j 'o.data.slice(0,4).map(i=>"- ["+i.severity+"] "+i.title.en).join("\n")'
expect "$(call GET /insights "$SAAD" | j 'o.error.status')" "403" "suppliers cannot read restaurant reports"

step "Marketing site lead capture"
expect "$(call POST /leads "" '{"name":"Test Owner","company":"Smoke Cafe","email":"owner@smoke.sa","phone":"+966 50 000 0000","branches":2,"segment":"QSR"}' | j 'o.data.status')" "NEW" "demo request stored"
expect "$(call POST /leads "" '{"name":"x","company":"y","email":"bad","phone":"1","branches":0,"segment":"QSR"}' | j 'o.error.status')" "422" "invalid lead rejected"

printf '\n\033[1;32mAll smoke checks passed.\033[0m\n'
