import React, { useState, useEffect, useRef, useMemo } from 'react';

const NetworkDiagram = ({ 
  tasks, 
  dependencies = [], 
  layout = 'hierarchical', 
  orientation = 'TB',
  showDependencies = true,
  onTaskSelect = null,
  selectedTaskId = null 
}) => {
  const svgRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredTask, setHoveredTask] = useState(null);

  // Configuración del diagrama
  const NODE_WIDTH = 120;
  const NODE_HEIGHT = 80;
  const NODE_SPACING = 200;
  const LEVEL_SPACING = 150;

  // Calcular posiciones de los nodos basado en el layout
  const nodePositions = useMemo(() => {
    if (!tasks || tasks.length === 0) return {};

    const positions = {};
    const levels = {};
    const visited = new Set();

    // Función para calcular el nivel de cada tarea
    const calculateLevel = (taskId, level = 0) => {
      if (visited.has(taskId)) return level;
      visited.add(taskId);

      const task = tasks.find(t => t.id === taskId);
      if (!task) return level;

      // Encontrar el nivel máximo de los predecesores
      let maxPredecessorLevel = -1;
      if (task.predecessors && task.predecessors.length > 0) {
        for (const predId of task.predecessors) {
          const predLevel = calculateLevel(predId, level + 1);
          maxPredecessorLevel = Math.max(maxPredecessorLevel, predLevel);
        }
      }

      const currentLevel = Math.max(level, maxPredecessorLevel + 1);
      
      if (!levels[currentLevel]) {
        levels[currentLevel] = [];
      }
      levels[currentLevel].push(taskId);
      
      return currentLevel;
    };

    // Calcular niveles para todas las tareas
    tasks.forEach(task => {
      calculateLevel(task.id);
    });

    // Asignar posiciones basadas en el layout y orientación
    Object.keys(levels).forEach(levelKey => {
      const level = parseInt(levelKey);
      const tasksInLevel = levels[level];
      
      tasksInLevel.forEach((taskId, index) => {
        let x, y;
        
        if (layout === 'hierarchical') {
          if (orientation === 'TB' || orientation === 'BT') {
            x = index * NODE_SPACING - (tasksInLevel.length - 1) * NODE_SPACING / 2;
            y = level * LEVEL_SPACING;
            if (orientation === 'BT') y = -y;
          } else {
            x = level * LEVEL_SPACING;
            y = index * NODE_SPACING - (tasksInLevel.length - 1) * NODE_SPACING / 2;
            if (orientation === 'RL') x = -x;
          }
        } else if (layout === 'radial') {
          const angle = (index / tasksInLevel.length) * 2 * Math.PI;
          const radius = level * LEVEL_SPACING;
          x = Math.cos(angle) * radius;
          y = Math.sin(angle) * radius;
        } else if (layout === 'grid') {
          const cols = Math.ceil(Math.sqrt(tasks.length));
          const row = Math.floor(index / cols);
          const col = index % cols;
          x = col * NODE_SPACING;
          y = row * LEVEL_SPACING;
        }

        positions[taskId] = { x, y };
      });
    });

    return positions;
  }, [tasks, layout, orientation]);

  // Calcular dimensiones del diagrama
  const diagramBounds = useMemo(() => {
    if (Object.keys(nodePositions).length === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }

    const positions = Object.values(nodePositions);
    const minX = Math.min(...positions.map(p => p.x)) - NODE_WIDTH / 2;
    const maxX = Math.max(...positions.map(p => p.x)) + NODE_WIDTH / 2;
    const minY = Math.min(...positions.map(p => p.y)) - NODE_HEIGHT / 2;
    const maxY = Math.max(...positions.map(p => p.y)) + NODE_HEIGHT / 2;

    return { minX, maxX, minY, maxY };
  }, [nodePositions]);

  // Calcular dimensiones del SVG
  const svgDimensions = useMemo(() => {
    const { minX, maxX, minY, maxY } = diagramBounds;
    const width = Math.max(800, (maxX - minX) * zoom + 100);
    const height = Math.max(600, (maxY - minY) * zoom + 100);
    
    return { width, height };
  }, [diagramBounds, zoom]);

  // Funciones de zoom y pan
  const zoomIn = () => setZoom(prev => Math.min(prev * 1.2, 3));
  const zoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.3));
  const resetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const centerDiagram = () => {
    const { minX, maxX, minY, maxY } = diagramBounds;
    const centerX = -(minX + maxX) / 2;
    const centerY = -(minY + maxY) / 2;
    setPan({ x: centerX, y: centerY });
  };

  // Eventos del mouse
  const handleMouseDown = (e) => {
    if (e.button === 0) { // Botón izquierdo
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.3, Math.min(3, prev * delta)));
  };

  // Función para renderizar un nodo
  const renderNode = (task) => {
    const position = nodePositions[task.id];
    if (!position) return null;

    const isSelected = selectedTaskId === task.id;
    const isHovered = hoveredTask === task.id;
    const isCritical = task.isCritical;
    const isMilestone = task.isMilestone;

    // Colores basados en el estado
    let nodeColor = '#3B82F6'; // Azul por defecto
    if (isCritical) nodeColor = '#EF4444'; // Rojo para críticas
    else if (isMilestone) nodeColor = '#8B5CF6'; // Púrpura para milestones
    else if (task.status === 'completed') nodeColor = '#10B981'; // Verde para completadas
    else if (task.status === 'delayed') nodeColor = '#F59E0B'; // Amarillo para retrasadas

    const x = (position.x + pan.x) * zoom;
    const y = (position.y + pan.y) * zoom;
    const width = NODE_WIDTH * zoom;
    const height = NODE_HEIGHT * zoom;

    return (
      <g key={task.id}>
        {/* Sombra */}
        <rect
          x={x + 2}
          y={y + 2}
          width={width}
          height={height}
          rx={8 * zoom}
          fill="#00000020"
        />
        
        {/* Nodo principal */}
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx={8 * zoom}
          fill={nodeColor}
          stroke={isSelected ? '#1F2937' : isHovered ? '#374151' : 'none'}
          strokeWidth={isSelected ? 3 * zoom : isHovered ? 2 * zoom : 0}
          opacity={isHovered ? 0.9 : 1}
          cursor="pointer"
          onMouseEnter={() => setHoveredTask(task.id)}
          onMouseLeave={() => setHoveredTask(null)}
          onClick={() => onTaskSelect && onTaskSelect(task)}
        />

        {/* Borde especial para tareas críticas */}
        {isCritical && (
          <rect
            x={x - 2}
            y={y - 2}
            width={width + 4}
            height={height + 4}
            rx={10 * zoom}
            fill="none"
            stroke="#DC2626"
            strokeWidth={2 * zoom}
            strokeDasharray={`${5 * zoom} ${5 * zoom}`}
          />
        )}

        {/* Icono de milestone */}
        {isMilestone && (
          <text
            x={x + width / 2}
            y={y + height / 2 - 15 * zoom}
            textAnchor="middle"
            fontSize={16 * zoom}
            fill="white"
            fontWeight="bold"
          >
            🏹
          </text>
        )}

        {/* Nombre de la tarea */}
        <text
          x={x + width / 2}
          y={y + height / 2 + (isMilestone ? 5 : -5) * zoom}
          textAnchor="middle"
          fontSize={10 * zoom}
          fill="white"
          fontWeight="bold"
          className="select-none"
        >
          {task.name.length > 15 ? task.name.substring(0, 15) + '...' : task.name}
        </text>

        {/* Información adicional */}
        <text
          x={x + width / 2}
          y={y + height / 2 + 15 * zoom}
          textAnchor="middle"
          fontSize={8 * zoom}
          fill="white"
          opacity={0.9}
          className="select-none"
        >
          {task.duration}d | {task.progress}%
        </text>

        {/* Indicador de estado */}
        <circle
          cx={x + width - 8 * zoom}
          cy={y + 8 * zoom}
          r={4 * zoom}
          fill={
            task.status === 'completed' ? '#10B981' :
            task.status === 'in-progress' ? '#3B82F6' :
            task.status === 'delayed' ? '#F59E0B' :
            '#6B7280'
          }
        />
      </g>
    );
  };

  // Función para renderizar las conexiones
  const renderConnections = () => {
    if (!showDependencies) return null;

    return tasks.map(task => {
      if (!task.predecessors || task.predecessors.length === 0) return null;

      return task.predecessors.map(predId => {
        const predTask = tasks.find(t => t.id === predId);
        const predPos = nodePositions[predId];
        const currentPos = nodePositions[task.id];

        if (!predTask || !predPos || !currentPos) return null;

        const startX = (predPos.x + NODE_WIDTH / 2 + pan.x) * zoom;
        const startY = (predPos.y + NODE_HEIGHT / 2 + pan.y) * zoom;
        const endX = (currentPos.x + NODE_WIDTH / 2 + pan.x) * zoom;
        const endY = (currentPos.y + NODE_HEIGHT / 2 + pan.y) * zoom;

        // Calcular punto de conexión en el borde del nodo
        const dx = endX - startX;
        const dy = endY - startY;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length === 0) return null;

        const unitX = dx / length;
        const unitY = dy / length;

        const adjustedStartX = startX + unitX * (NODE_WIDTH / 2 + 5) * zoom;
        const adjustedStartY = startY + unitY * (NODE_HEIGHT / 2 + 5) * zoom;
        const adjustedEndX = endX - unitX * (NODE_WIDTH / 2 + 5) * zoom;
        const adjustedEndY = endY - unitY * (NODE_HEIGHT / 2 + 5) * zoom;

        const isCritical = task.isCritical && predTask.isCritical;

        return (
          <g key={`${predId}-${task.id}`}>
            {/* Línea de conexión */}
            <line
              x1={adjustedStartX}
              y1={adjustedStartY}
              x2={adjustedEndX}
              y2={adjustedEndY}
              stroke={isCritical ? '#DC2626' : '#6B7280'}
              strokeWidth={isCritical ? 3 * zoom : 2 * zoom}
              strokeDasharray={isCritical ? `${5 * zoom} ${5 * zoom}` : 'none'}
              markerEnd="url(#arrowhead)"
            />

            {/* Flecha */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill={isCritical ? '#DC2626' : '#6B7280'}
                />
              </marker>
            </defs>
          </g>
        );
      });
    }).flat().filter(Boolean);
  };

  // Función para exportar como imagen
  const exportAsImage = () => {
    if (!svgRef.current) return;

    const svg = svgRef.current;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    canvas.width = svgDimensions.width;
    canvas.height = svgDimensions.height;
    
    img.onload = () => {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      const link = document.createElement('a');
      link.download = `network-diagram-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL();
      link.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
  };

  // Efectos
  useEffect(() => {
    centerDiagram();
  }, [tasks, layout, orientation]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        resetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!tasks || tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-4xl mb-4">🔗</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay tareas para mostrar</h3>
          <p className="text-gray-500">Agrega tareas al proyecto para ver el diagrama de red</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center space-x-2">
          <button
            onClick={zoomIn}
            className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            title="Zoom In"
          >
            🔍+
          </button>
          <button
            onClick={zoomOut}
            className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            title="Zoom Out"
          >
            🔍-
          </button>
          <button
            onClick={resetZoom}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            title="Reset Zoom"
          >
            🔄
          </button>
          <button
            onClick={centerDiagram}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            title="Centrar Diagrama"
          >
            🎯
          </button>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600">
            Zoom: {Math.round(zoom * 100)}%
          </div>
          <button
            onClick={exportAsImage}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            📤 Exportar
          </button>
        </div>
      </div>

      {/* Leyenda */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h4 className="font-semibold text-gray-700 mb-2">Leyenda</h4>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span>Tareas normales</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded border-2 border-red-600 border-dashed"></div>
            <span>Ruta crítica</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-purple-500 rounded"></div>
            <span>Milestones</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>Completadas</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span>Retrasadas</span>
          </div>
        </div>
      </div>

      {/* Diagrama SVG */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <svg
          ref={svgRef}
          width={svgDimensions.width}
          height={svgDimensions.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          className="select-none"
        >
          {/* Fondo con grid */}
          <defs>
            <pattern id="grid" width={20 * zoom} height={20 * zoom} patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f3f4f6" strokeWidth={0.5 * zoom} />
            </pattern>
          </defs>
          
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Conexiones */}
          {renderConnections()}
          
          {/* Nodos */}
          {tasks.map(renderNode)}
        </svg>
      </div>

      {/* Información del diagrama */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="font-semibold text-gray-700">Total Tareas</div>
            <div className="text-2xl font-bold text-blue-600">{tasks.length}</div>
          </div>
          <div>
            <div className="font-semibold text-gray-700">Tareas Críticas</div>
            <div className="text-2xl font-bold text-red-600">
              {tasks.filter(t => t.isCritical).length}
            </div>
          </div>
          <div>
            <div className="font-semibold text-gray-700">Milestones</div>
            <div className="text-2xl font-bold text-purple-600">
              {tasks.filter(t => t.isMilestone).length}
            </div>
          </div>
          <div>
            <div className="font-semibold text-gray-700">Dependencias</div>
            <div className="text-2xl font-bold text-gray-600">
              {tasks.reduce((sum, t) => sum + (t.predecessors?.length || 0), 0)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkDiagram;
