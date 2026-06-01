export default function AvatarLightbox({ url, name, onClose }) {
  if (!url) return null
  return (
    <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center"
         style={{ background: 'rgba(0,0,0,0.95)' }}
         onClick={onClose}>
      <img src={url} alt={name}
           className="max-w-[90vw] max-h-[80vh] rounded-3xl object-contain"
           style={{ boxShadow: '0 0 40px rgba(0,0,0,0.8)' }}
           onClick={e => e.stopPropagation()} />
      {name && (
        <p className="mt-4 text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>
          {name}
        </p>
      )}
      <button className="absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 18 }}
              onClick={onClose}>✕</button>
    </div>
  )
}
