import React from 'react'
export default function SectionCard({name, status, confidence}){
  return (
    <div className="section-card">
      <div style={{fontWeight:600}}>{name}</div>
      <div style={{marginTop:6}}>Status: <span style={{color: status === 'Active' ? '#16a34a' : '#6b7280'}}>{status}</span></div>
      <div style={{marginTop:6}}>Confidence: {Math.round(confidence*100)}%</div>
      <div style={{height:8, background:'#eef3fb', borderRadius:6, marginTop:8}}>
        <div style={{height:8, width:`${confidence*100}%`, background:'#0f3b63', borderRadius:6}}></div>
      </div>
    </div>
  )
}
