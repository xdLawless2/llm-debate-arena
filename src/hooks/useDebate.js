import { useState, useCallback, useRef } from 'react';
import { streamCompletion } from '../services/openrouter';
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

const isAbortError = (err) => err?.name === 'AbortError';

export function useDebate() {
  const [messages, setMessages] = useState([]);
  const [isDebating, setIsDebating] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(null);
  const [isJudging, setIsJudging] = useState(false);
  const [verdict, setVerdict] = useState(null);
  const [streamingMessage, setStreamingMessage] = useState(null);
  const [error, setError] = useState(null);
  const [wasStopped, setWasStopped] = useState(false);
  const [stoppedConfig, setStoppedConfig] = useState(null);

  const runIdRef = useRef(0);
  const activeRequestRef = useRef(null);

  const addMessage = useCallback((message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const isActiveRun = useCallback((runId) => runIdRef.current === runId, []);

  const startRun = useCallback(() => {
    runIdRef.current += 1;
    return runIdRef.current;
  }, []);

  const invalidateRun = useCallback(() => {
    runIdRef.current += 1;
  }, []);

  const abortActiveRequest = useCallback(() => {
    if (activeRequestRef.current) {
      activeRequestRef.current.abort();
      activeRequestRef.current = null;
    }
  }, []);

  const createRequestController = useCallback(() => {
    const controller = new AbortController();
    activeRequestRef.current = controller;
    return controller;
  }, []);

  const finalizeStreamingMessage = useCallback(() => {
    setStreamingMessage((current) => {
      if (current) {
        setMessages((prev) => {
          if (prev.some((message) => message.id === current.id)) {
            return prev;
          }
          return [...prev, { ...current, isPartial: true }];
        });
      }
      return null;
    });
  }, []);

  const runDebaterTurn = useCallback(async (
    runId,
    apiKey,
    model,
    side,
    phase,
    systemPrompt,
    userPrompt,
    options = {}
  ) => {
    const { roundNumber = null, thinking = false } = options;

    if (!isActiveRun(runId)) return null;

    const messageId = `${runId}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

    const controller = createRequestController();

    try {
      const result = await streamCompletion(
        apiKey,
        model,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        (content, thinkingContent) => {
          if (!isActiveRun(runId)) return;
          setStreamingMessage((prev) => {
            if (!prev || prev.id !== messageId) {
              return prev;
            }
            return {
              ...prev,
              content,
              thinking: thinkingContent,
            };
          });
        },
        { thinking, signal: controller.signal }
      );

      if (!isActiveRun(runId)) return null;

      const finalMessage = {
        ...newMessage,
        content: result.content,
        thinking: result.thinking,
      };
      addMessage(finalMessage);
      setStreamingMessage(null);
      return finalMessage;
    } catch (err) {
      if (isAbortError(err) || !isActiveRun(runId)) {
        return null;
      }
      if (isActiveRun(runId)) {
        setStreamingMessage(null);
      }
      throw err;
    } finally {
      if (activeRequestRef.current === controller) {
        activeRequestRef.current = null;
      }
    }
  }, [addMessage, createRequestController, isActiveRun]);

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

    const runId = startRun();
    abortActiveRequest();
    setIsDebating(true);
    setMessages([]);
    setVerdict(null);
    setError(null);
    setWasStopped(false);
    setStoppedConfig(config);
    setStreamingMessage(null);
    setIsJudging(false);
    setCurrentPhase(null);

    const rounds = preset === 'custom' ? customRounds : DEBATE_PRESETS[preset].rounds;

    const proSystemPrompt = getDebaterSystemPrompt('pro', topic, conModel);
    const conSystemPrompt = getDebaterSystemPrompt('con', topic, proModel);

    const debateHistory = [];

    try {
      // Opening Statements
      if (!isActiveRun(runId)) return;
      setCurrentPhase('Opening Statements');

      const proOpening = await runDebaterTurn(
        runId,
        apiKey,
        proModel,
        'pro',
        'opening',
        proSystemPrompt,
        getOpeningStatementPrompt('pro', topic),
        { thinking: proThinking }
      );
      if (!proOpening || !isActiveRun(runId)) return;
      debateHistory.push(proOpening);

      const conOpening = await runDebaterTurn(
        runId,
        apiKey,
        conModel,
        'con',
        'opening',
        conSystemPrompt,
        getOpeningStatementPrompt('con', topic),
        { thinking: conThinking }
      );
      if (!conOpening || !isActiveRun(runId)) return;
      debateHistory.push(conOpening);

      // Main Debate Rounds
      let lastProArg = proOpening.content;
      let lastConArg = conOpening.content;

      for (let i = 1; i <= rounds; i++) {
        if (!isActiveRun(runId)) return;
        setCurrentPhase(`Round ${i} of ${rounds}`);

        const proRound = await runDebaterTurn(
          runId,
          apiKey,
          proModel,
          'pro',
          'round',
          proSystemPrompt,
          getDebateRoundPrompt('pro', i, lastConArg),
          { roundNumber: i, thinking: proThinking }
        );
        if (!proRound || !isActiveRun(runId)) return;
        debateHistory.push(proRound);
        lastProArg = proRound.content;

        const conRound = await runDebaterTurn(
          runId,
          apiKey,
          conModel,
          'con',
          'round',
          conSystemPrompt,
          getDebateRoundPrompt('con', i, lastProArg),
          { roundNumber: i, thinking: conThinking }
        );
        if (!conRound || !isActiveRun(runId)) return;
        debateHistory.push(conRound);
        lastConArg = conRound.content;
      }

      // Rapid Fire Round
      setCurrentPhase('Rapid Fire');

      for (const question of RAPID_FIRE_QUESTIONS.slice(0, 3)) {
        if (!isActiveRun(runId)) return;

        const proRapid = await runDebaterTurn(
          runId,
          apiKey,
          proModel,
          'pro',
          'rapid-fire',
          proSystemPrompt,
          getRapidFirePrompt('pro', question),
          { thinking: proThinking }
        );
        if (!proRapid || !isActiveRun(runId)) return;
        debateHistory.push(proRapid);

        const conRapid = await runDebaterTurn(
          runId,
          apiKey,
          conModel,
          'con',
          'rapid-fire',
          conSystemPrompt,
          getRapidFirePrompt('con', question),
          { thinking: conThinking }
        );
        if (!conRapid || !isActiveRun(runId)) return;
        debateHistory.push(conRapid);
      }

      // Closing Statements
      setCurrentPhase('Closing Statements');

      const proClosing = await runDebaterTurn(
        runId,
        apiKey,
        proModel,
        'pro',
        'closing',
        proSystemPrompt,
        getClosingStatementPrompt('pro', topic),
        { thinking: proThinking }
      );
      if (!proClosing || !isActiveRun(runId)) return;
      debateHistory.push(proClosing);

      const conClosing = await runDebaterTurn(
        runId,
        apiKey,
        conModel,
        'con',
        'closing',
        conSystemPrompt,
        getClosingStatementPrompt('con', topic),
        { thinking: conThinking }
      );
      if (!conClosing || !isActiveRun(runId)) return;
      debateHistory.push(conClosing);

      // Judge Evaluation
      if (!isActiveRun(runId)) return;
      setCurrentPhase('Judging');
      setIsJudging(true);
      setVerdict('');

      const controller = createRequestController();
      let judgeResult;
      try {
        judgeResult = await streamCompletion(
          apiKey,
          judgeModel,
          [
            { role: 'system', content: getJudgeSystemPrompt() },
            { role: 'user', content: getJudgeEvaluationPrompt(topic, debateHistory) },
          ],
          (content) => {
            if (!isActiveRun(runId)) return;
            setVerdict(content);
          },
          { thinking: judgeThinking, signal: controller.signal }
        );
      } finally {
        if (activeRequestRef.current === controller) {
          activeRequestRef.current = null;
        }
      }

      if (!isActiveRun(runId)) return;
      setVerdict(judgeResult.content);
      setIsJudging(false);
      setCurrentPhase('Complete');
    } catch (err) {
      if (isAbortError(err) || !isActiveRun(runId)) {
        return;
      }
      setError(err.message);
    } finally {
      if (isActiveRun(runId)) {
        setIsDebating(false);
        setStreamingMessage(null);
        setIsJudging(false);
      }
    }
  }, [abortActiveRequest, createRequestController, isActiveRun, runDebaterTurn, startRun]);

  const stopDebate = useCallback(() => {
    invalidateRun();
    abortActiveRequest();
    finalizeStreamingMessage();
    setIsDebating(false);
    setWasStopped(true);
    setIsJudging(false);
  }, [abortActiveRequest, finalizeStreamingMessage, invalidateRun]);

  const resetDebate = useCallback(() => {
    invalidateRun();
    abortActiveRequest();
    // Clear all state
    setMessages([]);
    setVerdict(null);
    setError(null);
    setCurrentPhase(null);
    setStreamingMessage(null);
    setIsJudging(false);
    setWasStopped(false);
    setStoppedConfig(null);
    setIsDebating(false);
  }, [abortActiveRequest, invalidateRun]);

  const continueDebate = useCallback(async () => {
    if (!stoppedConfig || !wasStopped) return;

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
    } = stoppedConfig;

    const runId = startRun();
    abortActiveRequest();
    setStreamingMessage(null);
    setIsDebating(true);
    setError(null);
    setWasStopped(false);
    setIsJudging(false);

    const rounds = preset === 'custom' ? customRounds : DEBATE_PRESETS[preset].rounds;
    const proSystemPrompt = getDebaterSystemPrompt('pro', topic, conModel);
    const conSystemPrompt = getDebaterSystemPrompt('con', topic, proModel);

    // Analyze current messages to determine where we are
    const currentMessages = [...messages];
    const lastMessage = currentMessages[currentMessages.length - 1];
    const hasPartial = Boolean(lastMessage?.isPartial);
    const baseMessages = hasPartial ? currentMessages.slice(0, -1) : currentMessages;

    if (hasPartial) {
      setMessages(baseMessages);
    }

    // Count completed messages by phase
    const existingMessages = baseMessages;
    const rapidFireMessages = existingMessages.filter(m => m.phase === 'rapid-fire');

    // Build debate history from existing messages for judge
    const debateHistory = [...existingMessages];

    // Helper to get last argument from a side
    const getLastArg = (side) => {
      const sideMessages = existingMessages.filter(m => m.side === side);
      return sideMessages.length > 0 ? sideMessages[sideMessages.length - 1].content : '';
    };

    let lastProArg = getLastArg('pro');
    let lastConArg = getLastArg('con');

    try {
      // Determine resume point based on stopped streaming message or last completed message
      let resumePhase = 'opening';
      let resumeSide = 'pro';
      let resumeRound = 1;
      let resumeRapidFireIndex = 0;

      if (hasPartial && lastMessage) {
        resumePhase = lastMessage.phase;
        resumeSide = lastMessage.side;
        resumeRound = lastMessage.roundNumber || 1;

        if (resumePhase === 'rapid-fire') {
          resumeRapidFireIndex = Math.floor(rapidFireMessages.length / 2);
        }
      } else {
        // Resume from after the last completed message
        const lastCompleted = baseMessages[baseMessages.length - 1];
        if (lastCompleted) {
          if (lastCompleted.phase === 'opening') {
            if (lastCompleted.side === 'pro') {
              resumePhase = 'opening';
              resumeSide = 'con';
            } else {
              resumePhase = 'round';
              resumeSide = 'pro';
              resumeRound = 1;
            }
          } else if (lastCompleted.phase === 'round') {
            if (lastCompleted.side === 'pro') {
              resumePhase = 'round';
              resumeSide = 'con';
              resumeRound = lastCompleted.roundNumber;
            } else {
              if (lastCompleted.roundNumber < rounds) {
                resumePhase = 'round';
                resumeSide = 'pro';
                resumeRound = lastCompleted.roundNumber + 1;
              } else {
                resumePhase = 'rapid-fire';
                resumeSide = 'pro';
                resumeRapidFireIndex = 0;
              }
            }
          } else if (lastCompleted.phase === 'rapid-fire') {
            const rfCount = rapidFireMessages.length;
            if (lastCompleted.side === 'pro') {
              resumePhase = 'rapid-fire';
              resumeSide = 'con';
              resumeRapidFireIndex = Math.floor(rfCount / 2);
            } else {
              const currentRfIndex = Math.floor((rfCount - 1) / 2);
              if (currentRfIndex < 2) {
                resumePhase = 'rapid-fire';
                resumeSide = 'pro';
                resumeRapidFireIndex = currentRfIndex + 1;
              } else {
                resumePhase = 'closing';
                resumeSide = 'pro';
              }
            }
          } else if (lastCompleted.phase === 'closing') {
            if (lastCompleted.side === 'pro') {
              resumePhase = 'closing';
              resumeSide = 'con';
            } else {
              resumePhase = 'judging';
            }
          }
        }
      }

      // Now continue from the resume point

      // Opening Statements
      if (resumePhase === 'opening') {
        if (!isActiveRun(runId)) return;
        setCurrentPhase('Opening Statements');

        if (resumeSide === 'pro') {
          const proOpening = await runDebaterTurn(
            runId,
            apiKey, proModel, 'pro', 'opening',
            proSystemPrompt,
            getOpeningStatementPrompt('pro', topic),
            { thinking: proThinking }
          );
          if (!proOpening || !isActiveRun(runId)) return;
          debateHistory.push(proOpening);
          lastProArg = proOpening.content;
          resumeSide = 'con';
        }

        if (resumeSide === 'con') {
          const conOpening = await runDebaterTurn(
            runId,
            apiKey, conModel, 'con', 'opening',
            conSystemPrompt,
            getOpeningStatementPrompt('con', topic),
            { thinking: conThinking }
          );
          if (!conOpening || !isActiveRun(runId)) return;
          debateHistory.push(conOpening);
          lastConArg = conOpening.content;
        }

        resumePhase = 'round';
        resumeSide = 'pro';
        resumeRound = 1;
      }

      // Main Debate Rounds
      if (resumePhase === 'round') {
        for (let i = resumeRound; i <= rounds; i++) {
          if (!isActiveRun(runId)) return;
          setCurrentPhase(`Round ${i} of ${rounds}`);

          const startSide = (i === resumeRound) ? resumeSide : 'pro';

          if (startSide === 'pro') {
            const proRound = await runDebaterTurn(
              runId,
              apiKey, proModel, 'pro', 'round',
              proSystemPrompt,
              getDebateRoundPrompt('pro', i, lastConArg),
              { roundNumber: i, thinking: proThinking }
            );
            if (!proRound || !isActiveRun(runId)) return;
            debateHistory.push(proRound);
            lastProArg = proRound.content;
          }

          const conRound = await runDebaterTurn(
            runId,
            apiKey, conModel, 'con', 'round',
            conSystemPrompt,
            getDebateRoundPrompt('con', i, lastProArg),
            { roundNumber: i, thinking: conThinking }
          );
          if (!conRound || !isActiveRun(runId)) return;
          debateHistory.push(conRound);
          lastConArg = conRound.content;
        }

        resumePhase = 'rapid-fire';
        resumeSide = 'pro';
        resumeRapidFireIndex = 0;
      }

      // Rapid Fire Round
      if (resumePhase === 'rapid-fire') {
        if (!isActiveRun(runId)) return;
        setCurrentPhase('Rapid Fire');

        for (let qi = resumeRapidFireIndex; qi < 3; qi++) {
          if (!isActiveRun(runId)) return;
          const question = RAPID_FIRE_QUESTIONS[qi];
          const startSide = (qi === resumeRapidFireIndex) ? resumeSide : 'pro';

          if (startSide === 'pro') {
            const proRapid = await runDebaterTurn(
              runId,
              apiKey, proModel, 'pro', 'rapid-fire',
              proSystemPrompt,
              getRapidFirePrompt('pro', question),
              { thinking: proThinking }
            );
            if (!proRapid || !isActiveRun(runId)) return;
            debateHistory.push(proRapid);
          }

          const conRapid = await runDebaterTurn(
            runId,
            apiKey, conModel, 'con', 'rapid-fire',
            conSystemPrompt,
            getRapidFirePrompt('con', question),
            { thinking: conThinking }
          );
          if (!conRapid || !isActiveRun(runId)) return;
          debateHistory.push(conRapid);
        }

        resumePhase = 'closing';
        resumeSide = 'pro';
      }

      // Closing Statements
      if (resumePhase === 'closing') {
        if (!isActiveRun(runId)) return;
        setCurrentPhase('Closing Statements');

        if (resumeSide === 'pro') {
          const proClosing = await runDebaterTurn(
            runId,
            apiKey, proModel, 'pro', 'closing',
            proSystemPrompt,
            getClosingStatementPrompt('pro', topic),
            { thinking: proThinking }
          );
          if (!proClosing || !isActiveRun(runId)) return;
          debateHistory.push(proClosing);
          resumeSide = 'con';
        }

        if (resumeSide === 'con') {
          const conClosing = await runDebaterTurn(
            runId,
            apiKey, conModel, 'con', 'closing',
            conSystemPrompt,
            getClosingStatementPrompt('con', topic),
            { thinking: conThinking }
          );
          if (!conClosing || !isActiveRun(runId)) return;
          debateHistory.push(conClosing);
        }

        resumePhase = 'judging';
      }

      // Judge Evaluation
      if (resumePhase === 'judging') {
        if (!isActiveRun(runId)) return;
        setCurrentPhase('Judging');
        setIsJudging(true);
        setVerdict('');

        // Use all messages for judging (current + newly added)
        const allMessages = [...existingMessages, ...debateHistory.filter(m => !existingMessages.find(em => em.id === m.id))];

        const controller = createRequestController();
        let judgeResult;
        try {
          judgeResult = await streamCompletion(
            apiKey,
            judgeModel,
            [
              { role: 'system', content: getJudgeSystemPrompt() },
              { role: 'user', content: getJudgeEvaluationPrompt(topic, allMessages) },
            ],
            (content) => {
              if (!isActiveRun(runId)) return;
              setVerdict(content);
            },
            { thinking: judgeThinking, signal: controller.signal }
          );
        } finally {
          if (activeRequestRef.current === controller) {
            activeRequestRef.current = null;
          }
        }

        if (!isActiveRun(runId)) return;
        setVerdict(judgeResult.content);
        setIsJudging(false);
        setCurrentPhase('Complete');
      }
    } catch (err) {
      if (isAbortError(err) || !isActiveRun(runId)) {
        return;
      }
      setError(err.message);
    } finally {
      if (isActiveRun(runId)) {
        setIsDebating(false);
        setStreamingMessage(null);
        setIsJudging(false);
      }
    }
  }, [abortActiveRequest, createRequestController, isActiveRun, messages, runDebaterTurn, startRun, stoppedConfig, wasStopped]);

  return {
    messages,
    streamingMessage,
    isDebating,
    currentPhase,
    isJudging,
    verdict,
    error,
    wasStopped,
    startDebate,
    stopDebate,
    resetDebate,
    continueDebate,
  };
}
