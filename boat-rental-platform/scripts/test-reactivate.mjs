// Verifies the exact "set status = active on save" decision from ListingWizard's
// handlePublish, across every case. Mirrors:
//   const isPaused = !!(boatId && initialStatus === 'paused')
//   activate = !targetHostId && (!isPaused || reactivate)
function willActivate({ boatId, targetHostId, initialStatus, reactivate }) {
  const isPaused = !!(boatId && initialStatus === 'paused')
  return !targetHostId && (!isPaused || reactivate)
}

const cases = [
  // desc, input, expected-activate
  ['New self-serve listing (auto-publish)', { boatId: null, targetHostId: null, initialStatus: null, reactivate: true }, true],
  ['Edit an ACTIVE listing (stays active)', { boatId: 'b', targetHostId: null, initialStatus: 'active', reactivate: true }, true],
  ['Edit a DRAFT (completed draft publishes)', { boatId: 'b', targetHostId: null, initialStatus: 'draft', reactivate: true }, true],
  ['Edit a PAUSED listing, box TICKED (reactivates)  ← the fix', { boatId: 'b', targetHostId: null, initialStatus: 'paused', reactivate: true }, true],
  ['Edit a PAUSED listing, box UNTICKED (stays paused)', { boatId: 'b', targetHostId: null, initialStatus: 'paused', reactivate: false }, false],
  ['Admin concierge edit of a paused boat (stays draft/paused)', { boatId: 'b', targetHostId: 'host', initialStatus: 'paused', reactivate: true }, false],
  ['Admin concierge NEW listing (stays draft)', { boatId: null, targetHostId: 'host', initialStatus: null, reactivate: true }, false],
]

let pass = 0, fail = 0
for (const [desc, input, expected] of cases) {
  const got = willActivate(input)
  const ok = got === expected
  ok ? pass++ : fail++
  console.log(`  ${ok ? '✓' : '✗'} ${desc}  →  ${got ? 'ACTIVE' : 'unchanged'}${ok ? '' : `  (expected ${expected ? 'ACTIVE' : 'unchanged'})`}`)
}
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
