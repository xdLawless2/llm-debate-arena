import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Scale, Trophy, Loader2 } from 'lucide-react';

export function JudgeVerdict({ verdict, judgeModel, isJudging }) {
  if (!isJudging && !verdict) return null;

  return (
    <div className={`judge-verdict ${isJudging ? 'judging' : ''}`}>
      <div className="judge-header">
        {isJudging ? <Scale size={24} /> : <Trophy size={24} />}
        <span>{isJudging ? `Judge: ${judgeModel}` : "Judge's Verdict"}</span>
        {!isJudging && <span className="judge-model">by {judgeModel}</span>}
      </div>
      {isJudging && (
        <div className="judging-status">
          <Loader2 size={24} className="spin" />
          <span>Evaluating the debate...</span>
        </div>
      )}
      {verdict && (
        <div className="verdict-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{verdict}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
