
import React from 'react'
export default function Navbar({setRoute}){
  return (
    <div style={{background:'#0f3b63', color:'#fff', padding:12, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
     <div style={{ fontWeight: 700, textAlign: "center", fontSize: "24px" }}>
  Agentic Multi-Section RAG System
</div>


      <div style={{display:'flex', gap:16}}>
        <button onClick={()=>setRoute('chat')} style={{background:'transparent', color:'#fff', border:'none', cursor:'pointer'}}>Chat</button>
        <button onClick={()=>setRoute('dashboard')} style={{background:'transparent', color:'#fff', border:'none', cursor:'pointer'}}>Dashboard</button>
      </div>
    </div>
  )
}
