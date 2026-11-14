import { useState } from 'react';
import { deleteJson, usePolling } from './officeApi';
import type { BriefingTemplate, TemplatesResponse } from './officeApi';
import { useOfficeLang } from './i18n';
import { BAD_FG, INK, LINE, LINE_SOFT, MONO, MUTED, OK_FG, PAPER, WYLIE, WYLIE_DARK, WYLIE_TINT, h2Style, smallMuted } from './officeTheme';

interface TemplatesTabProps {
  connected: boolean;
  apiBase?: string;
  /** [이 템플릿으로 쓰기] — 커맨드 센터가 입력창(브리핑 양식)에 채운다 */
  onUse: (tpl: BriefingTemplate) => void;
}

const SHOW_CONSTRAINTS = 3;

/**
 * 템플릿 탭 — 자주 쓰는 브리핑(RFP 검토·제안서·주간 보고·회의록·벤치마킹·화면설계)을 골라 입력창에 채운다.
 * 기본 6개는 서버 코드(server/templates.mjs, 한·영), 내 템플릿은 hive/templates.json(입력창의 [템플릿으로 저장]).
 * 채우기만 하고 보내지 않는다 — 보내기는 사람이 누른다. 기본 템플릿은 지울 수 없다.
 */
export function TemplatesTab({ connected, apiBase, onUse }: TemplatesTabProps) {
  const { t, lang } = useOfficeLang();
  const { data, refresh } = usePolling<TemplatesResponse>(connected ? `${apiBase}/api/templates?lang=${lang}` : undefined, 10000);
  const [confirmDel, setConfirmDel] = useState('');
  const [msg, setMsg] = useState('');
  const [failed, setFailed] = useState(false);
  if (!connected) return <p style={smallMuted}>{t('tpl.offline')}</p>;
  if (!data) return <p style={smallMuted}>{t('tpl.loading')}</p>;
  const mine = data.templates.filter((x) => !x.builtin);
  const builtin = data.templates.filter((x) => x.builtin);

  const use = (x: BriefingTemplate) => {
    onUse(x);
    setFailed(false);
    setMsg(t('tpl.used', { title: x.title }));
  };
  const remove = async (x: BriefingTemplate) => {
    const r = await deleteJson(`${apiBase}/api/templates/${encodeURIComponent(x.id)}`);
    setFailed(!r.ok);
    setMsg(r.ok ? t('tpl.deleted', { title: x.title }) : String(r.error));
    setConfirmDel('');
    refresh();
  };

  const card = (x: BriefingTemplate) => (
    <div key={x.id} style={{ border: `1px solid ${x.builtin ? LINE : '#C9B8E6'}`, borderRadius: 9, padding: '8px 11px', background: x.builtin ? '#FFFDF8' : '#FBF9FE', fontSize: 12.5 }}>
      <div style={{ display: 'flex', gap: 7, alignItems: 'baseline' }}>
        <span style={{ fontSize: 10.5, fontWeight: 800, padding: '0 6px', borderRadius: 3, whiteSpace: 'nowrap', background: x.builtin ? '#F2EFE7' : WYLIE_TINT, color: x.builtin ? MUTED : WYLIE_DARK }}>
          {x.builtin ? t('tpl.builtin') : t('tpl.mine')}
        </span>
        <span style={{ fontWeight: 800, color: INK, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={x.title}>{x.title}</span>
        {!x.builtin && <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 10.5, color: MUTED }}>{x.id}</span>}
      </div>
      <div style={{ marginTop: 4, lineHeight: 1.45 }}>
        <b style={{ color: WYLIE_DARK, fontSize: 11.5 }}>{t('tpl.result')}</b> <span style={{ color: INK }}>{x.result}</span>
      </div>
      {x.context && (
        <div title={x.context} style={{ marginTop: 3, fontSize: 11.5, color: MUTED, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          <b style={{ fontSize: 11 }}>{t('tpl.context')}</b> {x.context}
        </div>
      )}
      {x.constraints.length > 0 && (
        <ul style={{ listStyle: 'none', margin: '4px 0 0', padding: 0, display: 'flex', flexWrap: 'wrap', gap: 4 }} aria-label={t('tpl.constraints')}>
          {x.constraints.slice(0, SHOW_CONSTRAINTS).map((c) => (
            <li key={c} style={{ fontSize: 11, background: PAPER, border: `1px solid ${LINE_SOFT}`, borderRadius: 4, padding: '0 6px', color: INK, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c}>{c}</li>
          ))}
          {x.constraints.length > SHOW_CONSTRAINTS && <li style={{ fontSize: 11, color: MUTED }} title={x.constraints.slice(SHOW_CONSTRAINTS).join('\n')}>{t('tpl.moreC', { n: x.constraints.length - SHOW_CONSTRAINTS })}</li>}
        </ul>
      )}
      {x.steps && x.steps.length > 0 && (
        <div style={{ marginTop: 5, padding: '5px 8px', borderRadius: 6, background: PAPER, border: `1px solid ${LINE_SOFT}` }}>
          <b style={{ color: WYLIE_DARK, fontSize: 11 }}>{t('tpl.steps')}</b>
          <ul style={{ listStyle: 'none', margin: '2px 0 0', padding: 0, fontSize: 11, color: INK, lineHeight: 1.5 }}>
            {x.steps.map((s) => <li key={s}>{s}</li>)}
          </ul>
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, marginTop: 7, alignItems: 'center' }}>
        <button type="button" onClick={() => use(x)}
          style={{ font: 'inherit', fontSize: 12, fontWeight: 800, cursor: 'pointer', padding: '4px 11px', borderRadius: 4, border: `1px solid ${WYLIE_DARK}`, background: WYLIE, color: '#fff' }}>
          {t('tpl.use')}
        </button>
        {!x.builtin && (confirmDel === x.id ? (
          <>
            <span style={{ fontSize: 11.5, color: BAD_FG, fontWeight: 700 }}>{t('tpl.confirmDel')}</span>
            <button type="button" className="axo-iconbtn" style={{ color: BAD_FG }} onClick={() => remove(x)}>{t('tpl.delete')}</button>
            <button type="button" className="axo-iconbtn" onClick={() => setConfirmDel('')}>{t('tpl.cancel')}</button>
          </>
        ) : (
          <button type="button" className="axo-iconbtn" onClick={() => setConfirmDel(x.id)}>{t('tpl.delete')}</button>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      <h2 style={h2Style}>{t('tpl.title', { n: mine.length, max: data.max })}</h2>
      <p style={smallMuted}>{t('tpl.note')}</p>
      {msg && <p style={{ fontSize: 12, fontWeight: 600, margin: 0, color: failed ? BAD_FG : OK_FG }}>{msg}</p>}
      {mine.length ? mine.map(card) : <p style={{ ...smallMuted, fontSize: 11.5 }}>{t('tpl.empty')}</p>}
      {builtin.map(card)}
    </div>
  );
}
