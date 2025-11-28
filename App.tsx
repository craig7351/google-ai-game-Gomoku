
import React, { useState, useEffect, useRef } from 'react';
import { Board } from './components/Board';
import { createEmptyGrid, checkWin, checkDraw } from './services/gameLogic';
import { getGeminiMove } from './services/geminiService';
import { Player, GameMode, OnlineRole, ConnectionState, PeerData, ChatMessage } from './types';
import { PEER_CONFIG } from './constants';
import Peer, { DataConnection } from 'peerjs';

// Helper to generate short random ID
const generateShortId = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

const App: React.FC = () => {
  // Game State
  const [grid, setGrid] = useState<Player[][]>(createEmptyGrid());
  const [turn, setTurn] = useState<Player>(Player.Black);
  const [winner, setWinner] = useState<Player | null>(null);
  const [winningLine, setWinningLine] = useState<{ x: number; y: number }[] | null>(null);
  const [lastMove, setLastMove] = useState<{ x: number; y: number; player: Player } | null>(null);

  // App Mode State
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Online State
  const [onlineRole, setOnlineRole] = useState<OnlineRole | null>(null);
  const [myPeerId, setMyPeerId] = useState<string>('');
  const [remotePeerIdInput, setRemotePeerIdInput] = useState<string>('');
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected);
  
  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  
  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // FIX: Ref to track the latest grid state for event listeners (PeerJS callbacks)
  // This prevents the "stale closure" bug where stones disappear because the callback used an old grid state.
  const gridRef = useRef(grid);

  // Sync ref with state
  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  // Auto-scroll chat
  useEffect(() => {
    if (isChatOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen]);

  // Reset unread count when opening chat
  useEffect(() => {
    if (isChatOpen) {
      setUnreadCount(0);
    }
  }, [isChatOpen]);

  // --- Game Logic ---

  const handleCellClick = async (x: number, y: number) => {
    // Basic validation
    if (grid[y][x] !== Player.None || winner || isAiThinking) return;

    // Online turn validation
    if (gameMode === GameMode.Online) {
      if (connectionState !== ConnectionState.Connected) return;
      if (onlineRole === OnlineRole.Host && turn !== Player.Black) return;
      if (onlineRole === OnlineRole.Guest && turn !== Player.White) return;
    }

    // Execute Move
    executeMove(x, y, turn);

    // Send move to peer if online
    if (gameMode === GameMode.Online && connRef.current) {
      const data: PeerData = {
        type: 'MOVE',
        payload: { x, y, player: turn }
      };
      connRef.current.send(data);
    }
  };

  const executeMove = (x: number, y: number, player: Player) => {
    // IMPORTANT: Use gridRef.current to ensure we always have the latest board state
    const currentGrid = gridRef.current;
    const newGrid = currentGrid.map(row => [...row]);
    
    newGrid[y][x] = player;
    setGrid(newGrid);
    setLastMove({ x, y, player });

    const winLine = checkWin(newGrid, x, y, player);
    if (winLine) {
      setWinner(player);
      setWinningLine(winLine);
    } else if (checkDraw(newGrid)) {
      // Draw logic can be handled here if needed
    } else {
      setTurn(player === Player.Black ? Player.White : Player.Black);
    }
  };

  // --- AI Effect ---
  useEffect(() => {
    if (gameMode === GameMode.AI && turn === Player.White && !winner) {
      const playAiTurn = async () => {
        setIsAiThinking(true);
        try {
          const move = await getGeminiMove(grid, Player.White);
          executeMove(move.x, move.y, Player.White);
        } catch (error) {
          console.error("AI Failed", error);
        } finally {
          setIsAiThinking(false);
        }
      };
      playAiTurn();
    }
  }, [turn, gameMode, winner, grid]);

  // --- Online Logic ---

  // Initialize Peer when creating a room
  const createRoom = () => {
    setGameMode(GameMode.Online);
    setOnlineRole(OnlineRole.Host);
    setConnectionState(ConnectionState.Connecting);
    resetBoard();
    clearChat();

    const newId = generateShortId();
    const peer = new Peer(newId, PEER_CONFIG);

    peer.on('open', (id) => {
      setMyPeerId(id);
      // Host stays connecting until someone joins
    });

    peer.on('connection', (conn) => {
      connRef.current = conn;
      setConnectionState(ConnectionState.Connected);
      setupConnection(conn);
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
      setConnectionState(ConnectionState.Error);
    });

    peerRef.current = peer;
  };

  // Join a room
  const joinRoom = () => {
    if (!remotePeerIdInput) return;
    
    setGameMode(GameMode.Online);
    setOnlineRole(OnlineRole.Guest);
    setConnectionState(ConnectionState.Connecting);
    resetBoard();
    clearChat();

    const peer = new Peer(PEER_CONFIG); // Auto ID for guest

    peer.on('open', () => {
      const conn = peer.connect(remotePeerIdInput.toUpperCase());
      connRef.current = conn;
      
      conn.on('open', () => {
        setConnectionState(ConnectionState.Connected);
        setupConnection(conn);
      });
      
      conn.on('error', (err) => {
         console.error("Connection Error", err);
         setConnectionState(ConnectionState.Error);
      });
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
      setConnectionState(ConnectionState.Error);
    });

    peerRef.current = peer;
  };

  const setupConnection = (conn: DataConnection) => {
    conn.on('data', (data: any) => {
      const peerData = data as PeerData;
      
      if (peerData.type === 'MOVE') {
        const { x, y, player } = peerData.payload;
        executeMove(x, y, player);
      } else if (peerData.type === 'RESTART') {
        resetBoard();
      } else if (peerData.type === 'DISCONNECT') {
        setConnectionState(ConnectionState.Disconnected);
        alert('對方已離開遊戲');
        goHome();
      } else if (peerData.type === 'CHAT') {
        // Handle incoming chat
        setChatMessages(prev => [...prev, {
          id: Date.now().toString() + Math.random(),
          text: peerData.payload,
          isSelf: false,
          timestamp: Date.now()
        }]);
        
        // Update unread count if chat is closed, relying on function form to get current state if inside closure
        setIsChatOpen(currentIsOpen => {
          if (!currentIsOpen) {
            setUnreadCount(c => c + 1);
          }
          return currentIsOpen;
        });
      }
    });

    conn.on('close', () => {
      setConnectionState(ConnectionState.Disconnected);
    });
  };

  const sendChatMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim() || connectionState !== ConnectionState.Connected) return;

    // Add to local state
    const msg: ChatMessage = {
      id: Date.now().toString(),
      text: chatInput.trim(),
      isSelf: true,
      timestamp: Date.now()
    };
    setChatMessages(prev => [...prev, msg]);

    // Send to peer
    if (connRef.current) {
      const data: PeerData = {
        type: 'CHAT',
        payload: chatInput.trim()
      };
      connRef.current.send(data);
    }

    setChatInput('');
  };

  const resetBoard = () => {
    setGrid(createEmptyGrid());
    setTurn(Player.Black);
    setWinner(null);
    setWinningLine(null);
    setLastMove(null);
  };

  const clearChat = () => {
    setChatMessages([]);
    setUnreadCount(0);
    setIsChatOpen(false);
  }

  const handleRestart = () => {
    resetBoard();
    if (gameMode === GameMode.Online && connRef.current) {
      connRef.current.send({ type: 'RESTART' });
    }
  };

  const goHome = () => {
    if (connRef.current) {
      connRef.current.send({ type: 'DISCONNECT' });
      connRef.current.close();
    }
    if (peerRef.current) {
      peerRef.current.destroy();
    }
    peerRef.current = null;
    connRef.current = null;
    setGameMode(null);
    setOnlineRole(null);
    setConnectionState(ConnectionState.Disconnected);
    resetBoard();
    clearChat();
  };

  // --- Render Helpers ---

  const renderMainMenu = () => (
    <div className="flex flex-col gap-6 items-center z-10 animate-fade-in">
      <h1 className="text-5xl font-bold text-stone-800 tracking-wider mb-8 drop-shadow-md">五子棋大戰</h1>
      
      <button 
        onClick={() => setGameMode(GameMode.Local)}
        className="w-64 py-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-lg text-xl font-bold transition-transform transform hover:scale-105 active:scale-95"
      >
        本地雙人 (Local)
      </button>

      <button 
        onClick={() => setGameMode(GameMode.AI)}
        className="w-64 py-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-lg text-xl font-bold transition-transform transform hover:scale-105 active:scale-95"
      >
        挑戰 AI (vs Gemini)
      </button>

      <div className="w-64 bg-white/50 p-6 rounded-xl shadow-lg flex flex-col gap-3 backdrop-blur-sm border border-white/60">
        <h3 className="text-stone-700 font-bold text-center text-lg mb-2">線上對戰 (Online)</h3>
        <button 
          onClick={createRoom}
          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-colors shadow"
        >
          建立房間 (Host)
        </button>
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="輸入代碼" 
            className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase text-center font-mono"
            value={remotePeerIdInput}
            onChange={(e) => setRemotePeerIdInput(e.target.value.toUpperCase())}
            maxLength={6}
          />
          <button 
            onClick={joinRoom}
            className="px-4 bg-stone-700 hover:bg-stone-800 text-white rounded-lg font-bold transition-colors disabled:opacity-50"
            disabled={remotePeerIdInput.length < 3}
          >
            加入
          </button>
        </div>
      </div>
    </div>
  );

  const renderOnlineLobby = () => {
    if (onlineRole === OnlineRole.Host && connectionState !== ConnectionState.Connected) {
      return (
        <div className="bg-white/90 p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-6 max-w-md w-full animate-fade-in text-center">
          <h2 className="text-2xl font-bold text-stone-800">等待對手加入...</h2>
          <div className="bg-stone-100 p-4 rounded-xl w-full border border-stone-200">
            <p className="text-stone-500 text-sm mb-1">房間代碼</p>
            <div className="text-4xl font-mono font-bold tracking-widest text-emerald-600 select-all cursor-pointer"
                 onClick={() => navigator.clipboard.writeText(myPeerId)}
                 title="點擊複製">
              {myPeerId || "生成中..."}
            </div>
          </div>
          <p className="text-stone-600">請將此代碼分享給您的朋友</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          <button onClick={goHome} className="text-stone-500 hover:text-red-500 underline">取消</button>
        </div>
      );
    }
    
    if (onlineRole === OnlineRole.Guest && connectionState === ConnectionState.Connecting) {
      return (
        <div className="bg-white/90 p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-6 animate-fade-in">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          <h2 className="text-xl font-bold text-stone-800">正在連線至房間...</h2>
          <button onClick={goHome} className="text-stone-500 hover:text-red-500 underline">取消</button>
        </div>
      );
    }

    if (connectionState === ConnectionState.Error) {
      return (
        <div className="bg-white/90 p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 animate-fade-in">
          <div className="text-red-500 text-5xl">⚠️</div>
          <h2 className="text-xl font-bold text-stone-800">連線失敗</h2>
          <p className="text-stone-600">請檢查代碼是否正確或網路狀態</p>
          <button onClick={goHome} className="px-6 py-2 bg-stone-700 text-white rounded-lg">返回主選單</button>
        </div>
      );
    }

    return null; // Should transition to game board
  };

  const renderChatWindow = () => {
    if (gameMode !== GameMode.Online || connectionState !== ConnectionState.Connected) return null;

    return (
      <>
        {/* Chat Toggle Button (FAB) */}
        {!isChatOpen && (
          <button 
            onClick={() => setIsChatOpen(true)}
            className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-105 z-50"
          >
            {/* Chat Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
            {/* Unread Badge */}
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-stone-200 animate-bounce">
                {unreadCount > 9 ? '9+' : unreadCount}
              </div>
            )}
          </button>
        )}

        {/* Chat Window */}
        <div className={`fixed bottom-6 right-6 w-80 h-96 bg-white rounded-2xl shadow-2xl flex flex-col border border-stone-200 z-50 transition-all duration-300 transform origin-bottom-right ${isChatOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}>
          {/* Header */}
          <div className="bg-emerald-600 text-white p-4 rounded-t-2xl flex justify-between items-center shadow-sm">
            <h3 className="font-bold">聊天室</h3>
            <button onClick={() => setIsChatOpen(false)} className="hover:bg-emerald-700 p-1 rounded transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-stone-50">
            {chatMessages.length === 0 && (
              <p className="text-center text-stone-400 text-sm mt-4">還沒有訊息，打個招呼吧！</p>
            )}
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.isSelf ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm break-words shadow-sm ${
                  msg.isSelf 
                    ? 'bg-emerald-100 text-emerald-900 rounded-br-none border border-emerald-200' 
                    : 'bg-white text-stone-800 rounded-bl-none border border-stone-200'
                }`}>
                  {msg.text}
                </div>
                <span className="text-[10px] text-stone-400 mt-1 px-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={sendChatMessage} className="p-3 bg-white border-t border-stone-200 rounded-b-2xl flex gap-2">
            <input 
              type="text" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="輸入訊息..." 
              className="flex-1 px-3 py-2 bg-stone-100 rounded-full border-none focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
            />
            <button 
              type="submit" 
              disabled={!chatInput.trim()}
              className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            </button>
          </form>
        </div>
      </>
    );
  };

  const getStatusMessage = () => {
    if (winner) {
      const winnerName = winner === Player.Black ? "黑棋 (Black)" : "白棋 (White)";
      return `🏆 ${winnerName} 獲勝！`;
    }
    if (isAiThinking) return "🤖 AI 正在思考中...";
    
    if (gameMode === GameMode.Online) {
      if (connectionState !== ConnectionState.Connected) return "連線中...";
      const myTurn = (onlineRole === OnlineRole.Host && turn === Player.Black) ||
                     (onlineRole === OnlineRole.Guest && turn === Player.White);
      return myTurn ? "🟢 輪到你了！" : "⏳ 等待對手下棋...";
    }

    return `輪到 ${turn === Player.Black ? "黑棋 (Black)" : "白棋 (White)"}`;
  };

  // Main Render
  return (
    <div className="min-h-screen w-full bg-stone-200 flex flex-col items-center justify-center relative bg-repeat"
         style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }}>
      
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-stone-200/50 to-stone-400/50 pointer-events-none" />

      {/* Main Content */}
      {!gameMode ? (
        renderMainMenu()
      ) : (
        <>
          {/* Lobby Overlay */}
          {(gameMode === GameMode.Online && connectionState !== ConnectionState.Connected) ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              {renderOnlineLobby()}
            </div>
          ) : (
            <div className="z-10 flex flex-col items-center gap-6 animate-fade-in p-4 w-full max-w-2xl">
              {/* Header Info */}
              <div className="flex flex-col items-center gap-2 w-full">
                <div className="bg-white/90 px-8 py-3 rounded-full shadow-lg border border-white/50 backdrop-blur-md">
                  <h2 className={`text-2xl font-bold ${winner ? 'text-amber-600' : 'text-stone-800'}`}>
                    {getStatusMessage()}
                  </h2>
                </div>
                
                {gameMode === GameMode.Online && (
                  <div className="flex items-center gap-2 text-stone-600 text-sm font-mono bg-white/60 px-3 py-1 rounded shadow-sm">
                    <span className="font-bold">Room: {onlineRole === OnlineRole.Host ? myPeerId : remotePeerIdInput}</span>
                    <span className="w-px h-4 bg-stone-400"></span>
                    <span>You: {onlineRole === OnlineRole.Host ? 'Black ⚫' : 'White ⚪'}</span>
                  </div>
                )}
              </div>

              {/* The Board */}
              <Board 
                grid={grid} 
                lastMove={lastMove} 
                winningLine={winningLine} 
                onCellClick={handleCellClick}
                disabled={!!winner || isAiThinking || (gameMode === GameMode.Online && connectionState !== ConnectionState.Connected)}
              />

              {/* Footer Controls */}
              <div className="flex gap-4">
                <button 
                  onClick={handleRestart}
                  className="px-6 py-2 bg-stone-700 hover:bg-stone-800 text-white rounded-lg shadow-md font-bold transition-all hover:-translate-y-0.5"
                >
                  重新開始
                </button>
                <button 
                  onClick={goHome}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-md font-bold transition-all hover:-translate-y-0.5"
                >
                  離開遊戲
                </button>
              </div>

              {/* Chat Window */}
              {renderChatWindow()}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default App;
