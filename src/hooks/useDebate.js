import { useState, useCallback, useRef } from 'react';
import { streamCompletion, getCompletion } from '../services/openrouter';
import {
  getDebaterSystemPrompt,
  getOpeningStatementPrompt,
  getDebateRoundPrompt,
  getRapidFirePrompt,
  getClosingStatementPrompt,
  getJudgeSystemPrompt,
  getJudgeEvaluationPrompt,
  RAPID_FIRE_QUESTIONS,
  DEBATE_PRESETS,
} from '../services/prompts';

export function useDebate() {
  const [messages, setMessages] = useState([]);
  const [isDebating, setIsDebating] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(null);
  const [isJudging, setIsJudging] = useState(false);
  const [verdict, setVerdict] = useState(null);
  const [streamingMessage, setStreamingMessage] = useState(null);
  const [error, setError] = useState(null);

  const abortRef = useRef(false);

  const addMessage = useCallback((message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const runDebaterTurn = useCallback(async (
    apiKey,
    model,
    side,
    phase,
    systemPrompt,
    userPrompt,
    options = {}
  ) => {
    const { roundNumber = null, thinking = false } = options;

    if (abortRef.current) return null;

    const messageId = Date.now();
    const newMessage = {
      id: messageId,
      side,
      phase,
      content: '',
      thinking: '',
      model,
      roundNumber,
    };

    setStreamingMessage(newMessage);

    try {
      const result = await streamCompletion(
        apiKey,
        model,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        (content, thinkingContent) => {
          if (!abortRef.current) {
            setStreamingMessage((prev) => ({
              ...prev,
              content,
              thinking: thinkingContent,
            }));
          }
        },
        { thinking }
      );

      if (abortRef.current) return null;

      const finalMessage = {
        ...newMessage,
        content: result.content,
        thinking: result.thinking,
      };
      addMessage(finalMessage);
      setStreamingMessage(null);
      return finalMessage;
    } catch (err) {
      setStreamingMessage(null);
      throw err;
    }
  }, [addMessage]);

  const startDebate = useCallback(async (config) => {
    const {
      apiKey,
      topic,
      proModel,
      conModel,
      judgeModel,
      proThinking,
      conThinking,
      judgeThinking,
      preset,
      customRounds,
    } = config;

    if (!apiKey || !topic) {
      setError('Please provide an API key and debate topic');
      return;
    }

    abortRef.current = false;
    setIsDebating(true);
    setMessages([]);
    setVerdict(null);
    setError(null);

    const rounds = preset === 'custom' ? customRounds : DEBATE_PRESETS[preset].rounds;

    const proSystemPrompt = getDebaterSystemPrompt('pro', topic, conModel);
    const conSystemPrompt = getDebaterSystemPrompt('con', topic, proModel);

    const debateHistory = [];

    try {
      // Opening Statements
      setCurrentPhase('Opening Statements');

      const proOpening = await runDebaterTurn(
        apiKey,
        proModel,
        'pro',
        'opening',
        proSystemPrompt,
        getOpeningStatementPrompt('pro', topic),
        { thinking: proThinking }
      );
      if (!proOpening || abortRef.current) return;
      debateHistory.push(proOpening);

      const conOpening = await runDebaterTurn(
        apiKey,
        conModel,
        'con',
        'opening',
        conSystemPrompt,
        getOpeningStatementPrompt('con', topic),
        { thinking: conThinking }
      );
      if (!conOpening || abortRef.current) return;
      debateHistory.push(conOpening);

      // Main Debate Rounds
      let lastProArg = proOpening.content;
      let lastConArg = conOpening.content;

      for (let i = 1; i <= rounds; i++) {
        if (abortRef.current) return;
        setCurrentPhase(`Round ${i} of ${rounds}`);

        const proRound = await runDebaterTurn(
          apiKey,
          proModel,
          'pro',
          'round',
          proSystemPrompt,
          getDebateRoundPrompt('pro', i, lastConArg),
          { roundNumber: i, thinking: proThinking }
        );
        if (!proRound || abortRef.current) return;
        debateHistory.push(proRound);
        lastProArg = proRound.content;

        const conRound = await runDebaterTurn(
          apiKey,
          conModel,
          'con',
          'round',
          conSystemPrompt,
          getDebateRoundPrompt('con', i, lastProArg),
          { roundNumber: i, thinking: conThinking }
        );
        if (!conRound || abortRef.current) return;
        debateHistory.push(conRound);
        lastConArg = conRound.content;
      }

      // Rapid Fire Round
      setCurrentPhase('Rapid Fire');

      for (const question of RAPID_FIRE_QUESTIONS.slice(0, 3)) {
        if (abortRef.current) return;

        const proRapid = await runDebaterTurn(
          apiKey,
          proModel,
          'pro',
          'rapid-fire',
          proSystemPrompt,
          getRapidFirePrompt('pro', question),
          { thinking: proThinking }
        );
        if (!proRapid || abortRef.current) return;
        debateHistory.push(proRapid);

        const conRapid = await runDebaterTurn(
          apiKey,
          conModel,
          'con',
          'rapid-fire',
          conSystemPrompt,
          getRapidFirePrompt('con', question),
          { thinking: conThinking }
        );
        if (!conRapid || abortRef.current) return;
        debateHistory.push(conRapid);
      }

      // Closing Statements
      setCurrentPhase('Closing Statements');

      const proClosing = await runDebaterTurn(
        apiKey,
        proModel,
        'pro',
        'closing',
        proSystemPrompt,
        getClosingStatementPrompt('pro', topic),
        { thinking: proThinking }
      );
      if (!proClosing || abortRef.current) return;
      debateHistory.push(proClosing);

      const conClosing = await runDebaterTurn(
        apiKey,
        conModel,
        'con',
        'closing',
        conSystemPrompt,
        getClosingStatementPrompt('con', topic),
        { thinking: conThinking }
      );
      if (!conClosing || abortRef.current) return;
      debateHistory.push(conClosing);

      // Judge Evaluation
      if (abortRef.current) return;
      setCurrentPhase('Judging');
      setIsJudging(true);

      const judgeResult = await getCompletion(
        apiKey,
        judgeModel,
        [
          { role: 'system', content: getJudgeSystemPrompt() },
          { role: 'user', content: getJudgeEvaluationPrompt(topic, debateHistory) },
        ],
        { thinking: judgeThinking }
      );

      setVerdict(judgeResult.content);
      setIsJudging(false);
      setCurrentPhase('Complete');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsDebating(false);
      setStreamingMessage(null);
      setIsJudging(false);
    }
  }, [runDebaterTurn]);

  const stopDebate = useCallback(() => {
    abortRef.current = true;
    setIsDebating(false);
    setStreamingMessage(null);
  }, []);

  const resetDebate = useCallback(() => {
    setMessages([]);
    setVerdict(null);
    setError(null);
    setCurrentPhase(null);
    setStreamingMessage(null);
    setIsJudging(false);
    abortRef.current = false;
  }, []);

  return {
    messages,
    streamingMessage,
    isDebating,
    currentPhase,
    isJudging,
    verdict,
    error,
    startDebate,
    stopDebate,
    resetDebate,
  };
}
