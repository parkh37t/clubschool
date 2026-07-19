import { createRoot } from 'react-dom/client';
import { VirtualOfficeView } from '../components/VirtualOffice/VirtualOfficeView';

// 단일 HTML 스탠드얼론: 오피스 + 지시 콘솔.
// 같은 폴더에 office-state.json을 두면 실제 오케스트레이터 상태를 반영(없으면 데모).
const el = document.getElementById('root');
if (el) createRoot(el).render(<VirtualOfficeView stateUrl="office-state.json" />);
