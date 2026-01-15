import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Scale, Trophy, Loader2 } from 'lucide-react';

export function JudgeVerdict({ verdict, judgeModel, isJudging }) {
  if (isJudging) {
    return (
      <div className="judge-verdict judging">
        <div className="judge-header">
          <Scale size={24} />
          <span>Judge: {judgeModel}</span>
        </div>
        <div className="judging-status">
          <Loader2 size={24} className="spin" />
          <span>Evaluating the debate...</span>
        </div>
      </div>
    );
  }

  if (!verdict) return null;

  return (
    <div className="judge-verdict">
      <div className="judge-header">
        <Trophy size={24} />
        <span>Judge's Verdict</span>
        <span className="judge-model">by {judgeModel}</span>
      </div>
      <div className="verdict-content">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{verdict}</ReactMarkdown>
      </div>
    </div>
  );
}
