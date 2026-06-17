'use client';

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import BotSidePanel from './BotSidePanel';
import ArticleSidePanel from './ArticleSidePanel';
import ClientSidePanel from './ClientSidePanel';

interface NetworkGraphProps {
  bots: any[];
}

export default function NetworkGraph({ bots }: NetworkGraphProps) {
  const fgRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedBot, setSelectedBot] = useState<any>(null);

  // Resize observer to keep the canvas filling the container
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    
    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);
    
    return () => resizeObserver.disconnect();
  }, []);

  // Format the data for the graph
  const graphData = useMemo(() => {
    const nodes: any[] = [
      { id: 'central-manager', name: 'VINTED CORE', group: 0, val: 12 } // Central Node
    ];
    const links: any[] = [];
    
    bots.forEach(bot => {
      const isOnline = bot.lastSync ? (new Date().getTime() - new Date(bot.lastSync).getTime() < 20 * 60 * 1000) : false;
      const hasError = bot.logs?.[0]?.level === 'ERROR';

      // Base size for bot node, scale up if they make revenue
      const botSize = 5 + Math.min((bot.caDuJour || 0) / 10, 15);

      nodes.push({
        ...bot,
        id: bot.id,
        group: 1,
        val: botSize,
        isOnline,
        hasError
      });
      
      links.push({
        source: 'central-manager',
        target: bot.id,
        particles: isOnline ? (hasError ? 4 : 2) : 0,
        particleSpeed: isOnline ? (hasError ? 0.008 : 0.004) : 0,
        color: isOnline ? (hasError ? 'rgba(248, 113, 113, 0.4)' : 'rgba(16, 185, 129, 0.3)') : 'rgba(255, 255, 255, 0.05)',
        distance: 120 // Increased to leave enough room for the bot's article cloud
      });

      // Articles Nodes (Level 2)
      if (bot.articles) {
        bot.articles.forEach((article: any) => {
          const articleId = `article-${bot.id}-${article.id}`;
          nodes.push({
            id: articleId,
            name: article.title,
            group: 2,
            val: 1.5, // Small dot
            parentBot: bot.id
          });
          links.push({
            source: bot.id,
            target: articleId,
            particles: 0,
            color: 'rgba(139, 92, 246, 0.1)',
            distance: 40
          });
        });
      }

      // Conversations Nodes (Level 3 - Grey)
      if (bot.conversations) {
        bot.conversations.forEach((conv: any) => {
          nodes.push({
            id: conv.id,
            name: conv.username,
            group: 3,
            val: conv.hasBought ? 3 : (conv.hasOffer ? 2 : 1),
            hasOffer: conv.hasOffer,
            hasBought: conv.hasBought,
            parentBot: bot.id,
            // also pass conversation so we can show it in sidepanel
            conversation: conv.conversation
          });
          
          if (conv.itemId) {
            links.push({
              source: `article-${bot.id}-${conv.itemId}`,
              target: conv.id,
              particles: conv.hasBought ? 2 : 0,
              particleSpeed: 0.005,
              color: conv.hasBought ? 'rgba(250, 204, 21, 0.5)' : (conv.hasOffer ? 'rgba(96, 165, 250, 0.3)' : 'rgba(255, 255, 255, 0.05)'),
              distance: 20
            });
          } else {
            links.push({
              source: bot.id,
              target: conv.id,
              particles: 0,
              color: 'rgba(255, 255, 255, 0.05)',
              distance: 30
            });
          }
        });
      }
    });
    
    return { nodes, links };
  }, [bots]);

  // Configure custom link distances when graph is ready
  useEffect(() => {
    if (fgRef.current) {
      // Set fixed link distance and heavily increase link strength so it doesn't get overpowered by repulsion
      fgRef.current.d3Force('link')
        .distance((link: any) => link.distance || 30)
        .strength(1); // Force absolute adherence to the distance
        
      // Increase global repulsion to prevent overlapping the central node
      const chargeForce = fgRef.current.d3Force('charge');
      if (chargeForce) {
        chargeForce.strength((node: any) => {
          if (!node) return -150;
          if (node.group === 0) return -2000; // HUGE repulsion for central node
          if (node.group === 1) return -500;  // Bots push things away strongly
          return -150; // Normal repulsion for articles and clients
        }).distanceMax(300);
      }
    }
  }, [graphData]);

  const [hoverNode, setHoverNode] = useState<any>(null);
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [selectedClient, setSelectedClient] = useState<any>(null);

  const handleNodeClick = useCallback((node: any) => {
    // Reset all selections
    setSelectedBot(null);
    setSelectedArticle(null);
    setSelectedClient(null);

    if (node.group === 0) {
      return; // Central node clicked, just deselect
    }
    
    if (fgRef.current) {
      if (node.group === 1) {
        setSelectedBot(node);
        fgRef.current.centerAt(node.x + 50, node.y, 800);
        fgRef.current.zoom(3, 800);
      } else if (node.group === 2) {
        // Article clicked
        const botId = node.parentBot;
        const bot = bots.find(b => b.id === botId);
        const article = bot?.articles?.find((a: any) => `article-${bot.id}-${a.id}` === node.id || a.id === node.id);
        
        // If article not found directly, use node name
        setSelectedArticle(article || { id: node.id, name: node.name });
        
        fgRef.current.centerAt(node.x + 20, node.y, 800);
        fgRef.current.zoom(5, 800);
      } else if (node.group === 3) {
        // Client clicked
        const botId = node.parentBot;
        const bot = bots.find(b => b.id === botId);
        const client = bot?.conversations?.find((c: any) => c.id === node.id);
        
        setSelectedClient(client || { id: node.id, name: node.name });

        fgRef.current.centerAt(node.x + 20, node.y, 800);
        fgRef.current.zoom(5, 800);
      }
    }
  }, [bots]);

  const clearSelection = useCallback(() => {
    setSelectedBot(null);
    setSelectedArticle(null);
    setSelectedClient(null);
    if (fgRef.current) {
      fgRef.current.centerAt(0, 0, 800);
      fgRef.current.zoom(1.5, 800);
    }
  }, []);

  // Pulse animation for central node
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    let t = 0;
    const interval = setInterval(() => {
      t += 0.05;
      setPulse(Math.sin(t));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const drawStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) => {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  };

  const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const isCentral = node.group === 0;
    const isBot = node.group === 1;
    const isArticle = node.group === 2;
    const isClient = node.group === 3;
    const isHovered = node === hoverNode;
    const isSelected = selectedBot?.id === node.id;
    
    // Floating effect based on time and node ID
    const floatY = Math.sin((Date.now() / 1000) * 2 + (node.id?.toString().charCodeAt(0) || 0)) * 3;
    const drawY = node.y + floatY;
    
    // Default size and style
    const baseSize = node.val;
    const size = isCentral ? baseSize + (pulse * 1.5) : baseSize;

    if (isClient && (node.hasOffer || node.hasBought)) {
      // Draw a star for clients with offers or purchases
      ctx.fillStyle = node.hasBought ? '#eab308' : '#3b82f6'; // Gold or Blue
      ctx.shadowColor = node.hasBought ? '#facc15' : '#60a5fa';
      ctx.shadowBlur = node.hasBought ? 15 * globalScale : 8 * globalScale;
      
      drawStar(ctx, node.x, drawY, 5, size * 2, size);
      ctx.shadowBlur = 0; // Reset shadow
    } else {
      // Draw standard circle
      let fillColor = '#3f3f46'; // Default Offline/Client/Article
      let shadowColor = 'transparent';
      
      if (isCentral) {
        fillColor = '#8b5cf6'; // Core purple
        shadowColor = '#a78bfa';
      } else if (isBot && node.hasError) {
        fillColor = '#ef4444'; // Red
        shadowColor = '#f87171';
      } else if (isBot && node.isOnline) {
        fillColor = '#10b981'; // Emerald
        shadowColor = '#34d399';
      } else if (isArticle) {
        fillColor = '#8b5cf6'; // Articles are tiny purple dots
      }

      ctx.beginPath();
      ctx.arc(node.x, drawY, size, 0, 2 * Math.PI, false);
      ctx.fillStyle = fillColor;
      
      if (isCentral || (isBot && node.isOnline) || isHovered || isSelected) {
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = (isCentral ? 20 : 10) * globalScale;
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.fill();
      ctx.shadowBlur = 0; // Reset shadow
    }

    // Central Node Rings
    if (isCentral) {
      ctx.beginPath();
      ctx.arc(node.x, drawY, size + 4, 0, 2 * Math.PI, false);
      ctx.strokeStyle = `rgba(139, 92, 246, ${0.5 + pulse * 0.2})`;
      ctx.lineWidth = 1 / globalScale;
      ctx.stroke();
      
      ctx.beginPath();
      ctx.arc(node.x, drawY, size + 8 + (pulse * 2), 0, 2 * Math.PI, false);
      ctx.strokeStyle = `rgba(139, 92, 246, ${0.2 - pulse * 0.1})`;
      ctx.lineWidth = 0.5 / globalScale;
      ctx.stroke();
    }

    // Draw Selection Ring
    if (isSelected && isBot) {
      ctx.beginPath();
      ctx.arc(node.x, drawY, size + 3, 0, 2 * Math.PI, false);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5 / globalScale;
      ctx.stroke();
    }

    // Draw Label & Balance (Only for Bots and Central Node if zoomed out, and for hovered nodes)
    const shouldDrawLabel = isCentral || isBot || isHovered || (isClient && node.hasBought);
    
    if (shouldDrawLabel && (globalScale >= 1 || isHovered || isCentral || isSelected)) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      
      const fontSize = isCentral ? 14 / globalScale : (isBot ? 12 / globalScale : 8 / globalScale);
      ctx.font = `${isBot || isCentral ? 'bold' : 'normal'} ${fontSize}px Inter, sans-serif`;
      ctx.fillStyle = isHovered || isSelected || isCentral || (isClient && node.hasBought) ? '#ffffff' : '#a1a1aa';
      
      // Shift text lower for stars
      const textOffset = (isClient && (node.hasOffer || node.hasBought)) ? size * 2 : size;
      ctx.fillText(node.name, node.x, drawY + textOffset + 6 / globalScale);

      // Financials (for bots only)
      if (isBot) {
        const total = Number(node.balanceAvailable || 0) + Number(node.balancePending || 0);
        const balanceFontSize = 9 / globalScale;
        ctx.font = `${balanceFontSize}px Inter, monospace`;
        ctx.fillStyle = '#10b981'; // Emerald for money
        ctx.fillText(`${total.toFixed(2)} €`, node.x, drawY + textOffset + 6 / globalScale + fontSize + 2 / globalScale);
      }
    }
  }, [hoverNode, selectedBot, pulse]);

  return (
    <div ref={containerRef} className="w-full h-full relative cursor-crosshair">
      {/* Background Grid Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20 z-0"
        style={{
          backgroundImage: 'radial-gradient(#3f3f46 1px, transparent 1px)',
          backgroundSize: '30px 30px'
        }}
      />

      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        backgroundColor="#09090b" // bg-zinc-950
        nodeLabel={() => ''} // Disable default tooltip since we draw it natively on canvas
        
        // Node config
        nodeCanvasObject={paintNode}
        nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
          const floatY = Math.sin((Date.now() / 1000) * 2 + (node.id?.toString().charCodeAt(0) || 0)) * 3;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(node.x, node.y + floatY, node.val * 4, 0, 2 * Math.PI, false); // Hit area
          ctx.fill();
        }}
        onNodeHover={(node) => {
          setHoverNode(node);
          if (containerRef.current) {
            containerRef.current.style.cursor = node ? 'pointer' : 'crosshair';
          }
        }}
        onNodeClick={handleNodeClick}
        
        // Link config
        linkColor={(link: any) => link.color}
        linkWidth={(link: any) => (link.particles > 0 ? 1.5 : 0.5)}
        linkDirectionalParticles="particles"
        linkDirectionalParticleSpeed="particleSpeed"
        linkDirectionalParticleWidth={1.5}
        linkDirectionalParticleColor={(link: any) => link.color.replace('0.3', '1').replace('0.4', '1').replace('0.1', '1')}
        
        // Force engine setup
        d3VelocityDecay={0.4}
        warmupTicks={100}
        cooldownTicks={0}
      />

      {/* Interactive Side Panels */}
      <BotSidePanel bot={selectedBot} onClose={clearSelection} />
      <ArticleSidePanel article={selectedArticle} onClose={clearSelection} />
      <ClientSidePanel client={selectedClient} onClose={clearSelection} />

      {/* HUD Global Controls */}
      <div className="absolute bottom-6 left-6 z-10 flex gap-2">
        <button 
          onClick={() => {
            if (fgRef.current) {
              fgRef.current.zoomToFit(800, 50);
              setSelectedBot(null);
            }
          }}
          className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 text-xs font-semibold text-zinc-300 px-3 py-2 rounded-lg hover:bg-zinc-800 hover:text-white transition-colors shadow-lg"
        >
          Recadrer
        </button>
      </div>
    </div>
  );
}
