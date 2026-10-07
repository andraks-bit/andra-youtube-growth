'use client'

const gold = '#74cfe8'
const border = 'rgba(116,207,232,0.28)'

export default function EditNameButton({ id }: { id: string }) {
  return (
    <button
      onClick={() => window.dispatchEvent(new CustomEvent(`lead-edit-open:${id}`))}
      title="Edit name / company"
      style={{
        padding: '2px 8px', borderRadius: 7, background: 'transparent',
        border: `1px solid ${border}`, color: gold, fontSize: 10.5, fontWeight: 700,
        cursor: 'pointer', lineHeight: 1.6,
      }}
    >
      ✏ Edit
    </button>
  )
}
