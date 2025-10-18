import { useState } from "react";

export default function StarRating({ value = 0, onChange, size = 22 }) {
  const [hover, setHover] = useState(0);
  const stars = [1,2,3,4,5];

  return (
    <div style={{ display:"inline-flex", gap:8 }}>
      {stars.map(n => (
        <svg key={n}
          onMouseEnter={()=>setHover(n)} onMouseLeave={()=>setHover(0)}
          onClick={()=>onChange?.(n)}
          width={size} height={size} viewBox="0 0 24 24"
          style={{ cursor:"pointer", fill:(hover||value)>=n ? "#f59e0b" : "none", stroke:"#f59e0b" }}
        >
          <path strokeWidth="2" d="M12 17.27l6.18 3.73-1.64-7.03L21 9.24l-7.19-.62L12 2 10.19 8.62 3 9.24l4.46 4.73L5.82 21z"/>
        </svg>
      ))}
    </div>
  );
}
