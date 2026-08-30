const fs = require('fs');
const path = 'src/app/(saas)/app/coding-assistant/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const target =                           {proc.suggestions.map((sug: any, j: number) => (
                            <div key={j} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                              <div>
                                <strong style={{ color: '#fff' }}>{sug.code}</strong> - {sug.short_description}
                              </div>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                {sug.source === 'ai' ? (
                                  <span style={{ fontSize: '0.7rem', background: 'rgba(139,92,246,0.25)', color: '#c084fc', border: '1px solid rgba(139,92,246,0.5)', borderRadius: '4px', padding: '2px 6px', fontWeight: 700 }}>🤖 AI Coded</span>
                                ) : (
                                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Sim: {(sug.similarity * 100).toFixed(1)}%</span>
                                )}
                                <button type="button" onClick={() => handleCopyCode(sug.code)} style={{ padding: '4px 8px', background: copiedCode === sug.code ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.1)', border: copiedCode === sug.code ? '1px solid #4ade80' : '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', color: copiedCode === sug.code ? '#4ade80' : '#cbd5e1', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s' }}>
                                  {copiedCode === sug.code ? <><Icon.Check size={12}/> Copied</> : <><Icon.Copy size={12}/> Copy</>}
                                </button>
                              </div>
                            </div>
                          ))};

const replacement =                           {proc.suggestions.map((sug: any, j: number) => (
                            <div key={j} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                                <div>
                                  <strong style={{ color: '#fff' }}>{sug.code}</strong> - {sug.short_description}
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                  {sug.source === 'ai' ? (
                                    <span style={{ fontSize: '0.7rem', background: 'rgba(139,92,246,0.25)', color: '#c084fc', border: '1px solid rgba(139,92,246,0.5)', borderRadius: '4px', padding: '2px 6px', fontWeight: 700 }}>🤖 AI Coded</span>
                                  ) : (
                                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Sim: {(sug.similarity * 100).toFixed(1)}%</span>
                                  )}
                                  <button type="button" onClick={() => handleCopyCode(sug.code)} style={{ padding: '4px 8px', background: copiedCode === sug.code ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.1)', border: copiedCode === sug.code ? '1px solid #4ade80' : '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', color: copiedCode === sug.code ? '#4ade80' : '#cbd5e1', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s' }}>
                                    {copiedCode === sug.code ? <><Icon.Check size={12}/> Copied</> : <><Icon.Copy size={12}/> Copy</>}
                                  </button>
                                </div>
                              </div>
                              {sug.ncci_conflicts && sug.ncci_conflicts.length > 0 && sug.ncci_conflicts.map((conflict: any, k: number) => {
                                const isPrimary = conflict.primary === sug.code;
                                const otherCode = isPrimary ? conflict.bundled : conflict.primary;
                                if (isPrimary) return null; // We usually warn on the bundled (column 2) code
                                return (
                                  <div key={k} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', padding: '8px 12px', borderRadius: '6px', fontSize: '0.8rem', color: '#fef08a' }}>
                                    <Icon.AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '2px', color: '#eab308' }} />
                                    <div>
                                      <strong>NCCI Edit Warning:</strong> This code is bundled into <strong style={{color: '#fff'}}>{otherCode}</strong>. 
                                      {conflict.modifier_allowed ? ' A modifier (e.g., 59, XS) is required if performed on a separate lesion or site.' : ' No modifier is allowed. You cannot bill these together.'}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ))};

if (content.includes(target)) {
  fs.writeFileSync(path, content.replace(target, replacement));
  console.log('SUCCESS');
} else {
  console.log('TARGET NOT FOUND');
}
