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
  const [showOnlyCriticalPath, setShowOnlyCriticalPath] = useState(false);
  const [showSimplifiedView, setShowSimplifiedView] = useState(false);
  const [filterByStatus, setFilterByStatus] = useState('all');
  const [currentLayout, setCurrentLayout] = useState('hierarchical');
  const [autoFit, setAutoFit] = useState(true);

  // Configuración del diagrama - Dimensiones adaptativas
  const NODE_WIDTH = showSimplifiedView ? 100 : 120;
  const NODE_HEIGHT = showSimplifiedView ? 60 : 80;
  const NODE_SPACING = showSimplifiedView ? 150 : 180;
  const LEVEL_SPACING = showSimplifiedView ? 120 : 140;
  
  // Configuración responsiva basada en el número de tareas
  const totalTasks = filteredTasks.length;
  const isDenseDiagram = totalTasks > 20;
  const adaptiveNodeWidth = isDenseDiagram ? 90 : NODE_WIDTH;
  const adaptiveNodeHeight = isDenseDiagram ? 60 : NODE_HEIGHT;
  const adaptiveNodeSpacing = isDenseDiagram ? 120 : NODE_SPACING;
  const adaptiveLevelSpacing = isDenseDiagram ? 100 : LEVEL_SPACING;

  // Función para calcular la ruta crítica usando el algoritmo CPM
  const calculateCriticalPath = useMemo(() => {
    if (!tasks || tasks.length === 0) return { criticalTasks: [], criticalPath: [] };

    // Crear un mapa de tareas por ID
    const taskMap = new Map(tasks.map(task => [task.id, task]));
    
    // Calcular Early Start (ES) y Early Finish (EF)
    const earlyStart = new Map();
    const earlyFinish = new Map();
    const visited = new Set();
    
    const calculateEarlyTimes = (taskId) => {
      if (visited.has(taskId)) return earlyStart.get(taskId) || 0;
      visited.add(taskId);
      
      const task = taskMap.get(taskId);
      if (!task) return 0;
      
      let maxPredecessorFinish = 0;
      if (task.predecessors && task.predecessors.length > 0) {
        for (const predId of task.predecessors) {
          const predFinish = calculateEarlyTimes(predId);
          maxPredecessorFinish = Math.max(maxPredecessorFinish, predFinish);
        }
      }
      
      const duration = task.duration || 1;
      const es = maxPredecessorFinish;
      const ef = es + duration;
      
      earlyStart.set(taskId, es);
      earlyFinish.set(taskId, ef);
      
      return ef;
    };
    
    // Calcular Early Times para todas las tareas
    tasks.forEach(task => calculateEarlyTimes(task.id));
    
    // Encontrar el proyecto finish time
    const projectFinishTime = Math.max(...Array.from(earlyFinish.values()));
    
    // Calcular Late Start (LS) y Late Finish (LF)
    const lateStart = new Map();
    const lateFinish = new Map();
    
    const calculateLateTimes = (taskId) => {
      const task = taskMap.get(taskId);
      if (!task) return projectFinishTime;
      
      let minSuccessorStart = projectFinishTime;
      
      // Encontrar sucesores
      const successors = tasks.filter(t => 
        t.predecessors && t.predecessors.includes(taskId)
      );
      
      if (successors.length > 0) {
        for (const succ of successors) {
          const succLateStart = lateStart.get(succ.id);
          if (succLateStart !== undefined) {
            minSuccessorStart = Math.min(minSuccessorStart, succLateStart);
          } else {
            calculateLateTimes(succ.id);
            minSuccessorStart = Math.min(minSuccessorStart, lateStart.get(succ.id));
          }
        }
      }
      
      const duration = task.duration || 1;
      const lf = minSuccessorStart;
      const ls = lf - duration;
      
      lateStart.set(taskId, ls);
      lateFinish.set(taskId, lf);
      
      return ls;
    };
    
    // Calcular Late Times para todas las tareas (en orden inverso)
    const sortedTasks = [...tasks].sort((a, b) => 
      (earlyFinish.get(b.id) || 0) - (earlyFinish.get(a.id) || 0)
    );
    sortedTasks.forEach(task => calculateLateTimes(task.id));
    
    // Identificar tareas críticas (ES = LS y EF = LF)
    const criticalTasks = tasks.filter(task => {
      const es = earlyStart.get(task.id) || 0;
      const ef = earlyFinish.get(task.id) || 0;
      const ls = lateStart.get(task.id) || 0;
      const lf = lateFinish.get(task.id) || 0;
      
      return es === ls && ef === lf;
    });
    
    // Crear el path crítico ordenado
    const criticalPath = [];
    const criticalTaskIds = new Set(criticalTasks.map(t => t.id));
    
    // Encontrar el inicio del path crítico
    const startTasks = criticalTasks.filter(task => 
      !task.predecessors || task.predecessors.length === 0 || 
      !task.predecessors.some(predId => criticalTaskIds.has(predId))
    );
    
    if (startTasks.length > 0) {
      const startTask = startTasks[0];
      criticalPath.push(startTask);
      
      // Construir el path siguiendo las dependencias
      let currentTask = startTask;
      while (currentTask) {
        const nextTask = criticalTasks.find(task => 
          task.predecessors && task.predecessors.includes(currentTask.id)
        );
        if (nextTask && !criticalPath.includes(nextTask)) {
          criticalPath.push(nextTask);
          currentTask = nextTask;
        } else {
          currentTask = null;
        }
      }
    }
    
    return { criticalTasks, criticalPath };
  }, [tasks]);

  // Filtrar tareas según los filtros aplicados
  const filteredTasks = useMemo(() => {
    let filtered = tasks || [];
    
    // Filtrar por ruta crítica
    if (showOnlyCriticalPath) {
      filtered = filtered.filter(task => 
        calculateCriticalPath.criticalTasks.some(critical => critical.id === task.id)
      );
    }
    
    // Filtrar por estado
    if (filterByStatus !== 'all') {
      filtered = filtered.filter(task => {
        if (filterByStatus === 'completed') return task.status === 'completed';
        if (filterByStatus === 'in-progress') return task.status === 'in-progress' || task.status === 'pending';
        if (filterByStatus === 'delayed') return task.status === 'delayed';
        if (filterByStatus === 'critical') return calculateCriticalPath.criticalTasks.some(critical => critical.id === task.id);
        return true;
      });
    }
    
    return filtered;
  }, [tasks, showOnlyCriticalPath, filterByStatus, calculateCriticalPath]);

  // Calcular posiciones de los nodos basado en el layout
  const nodePositions = useMemo(() => {
    if (!filteredTasks || filteredTasks.length === 0) return {};

    const positions = {};
    const levels = {};
    const visited = new Set();

    // Función para calcular el nivel de cada tarea
    const calculateLevel = (taskId, level = 0) => {
      if (visited.has(taskId)) return level;
      visited.add(taskId);

      const task = filteredTasks.find(t => t.id === taskId);
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
    filteredTasks.forEach(task => {
      calculateLevel(task.id);
    });

    // Asignar posiciones basadas en el layout y orientación
    Object.keys(levels).forEach(levelKey => {
      const level = parseInt(levelKey);
      const tasksInLevel = levels[level];
      
      tasksInLevel.forEach((taskId, index) => {
        let x, y;
        
        if (currentLayout === 'hierarchical') {
          // Calcular espaciado dinámico basado en la densidad
          const dynamicNodeSpacing = Math.max(adaptiveNodeSpacing, 100);
          const dynamicLevelSpacing = Math.max(adaptiveLevelSpacing, 80);
          
          if (orientation === 'TB' || orientation === 'BT') {
            x = index * dynamicNodeSpacing - (tasksInLevel.length - 1) * dynamicNodeSpacing / 2;
            y = level * dynamicLevelSpacing;
            if (orientation === 'BT') y = -y;
          } else {
            x = level * dynamicLevelSpacing;
            y = index * dynamicNodeSpacing - (tasksInLevel.length - 1) * dynamicNodeSpacing / 2;
            if (orientation === 'RL') x = -x;
          }
        } else if (currentLayout === 'radial') {
          const angle = (index / tasksInLevel.length) * 2 * Math.PI;
          const radius = level * adaptiveLevelSpacing;
          x = Math.cos(angle) * radius;
          y = Math.sin(angle) * radius;
        } else if (currentLayout === 'grid') {
          const cols = Math.ceil(Math.sqrt(filteredTasks.length));
          const row = Math.floor(index / cols);
          const col = index % cols;
          x = col * adaptiveNodeSpacing;
          y = row * adaptiveLevelSpacing;
        } else if (currentLayout === 'compact') {
          // Layout compacto para diagramas densos
          const compactSpacing = Math.max(80, adaptiveNodeSpacing * 0.7);
          const compactLevelSpacing = Math.max(60, adaptiveLevelSpacing * 0.7);
          
          if (orientation === 'TB' || orientation === 'BT') {
            x = index * compactSpacing - (tasksInLevel.length - 1) * compactSpacing / 2;
            y = level * compactLevelSpacing;
            if (orientation === 'BT') y = -y;
          } else {
            x = level * compactLevelSpacing;
            y = index * compactSpacing - (tasksInLevel.length - 1) * compactSpacing / 2;
            if (orientation === 'RL') x = -x;
          }
        }

        positions[taskId] = { x, y };
      });
    });

    return positions;
  }, [filteredTasks, currentLayout, orientation, adaptiveNodeSpacing, adaptiveLevelSpacing]);

  // Calcular dimensiones del diagrama
  const diagramBounds = useMemo(() => {
    if (Object.keys(nodePositions).length === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }

    const positions = Object.values(nodePositions);
    const minX = Math.min(...positions.map(p => p.x)) - adaptiveNodeWidth / 2;
    const maxX = Math.max(...positions.map(p => p.x)) + adaptiveNodeWidth / 2;
    const minY = Math.min(...positions.map(p => p.y)) - adaptiveNodeHeight / 2;
    const maxY = Math.max(...positions.map(p => p.y)) + adaptiveNodeHeight / 2;

    return { minX, maxX, minY, maxY };
  }, [nodePositions, adaptiveNodeWidth, adaptiveNodeHeight]);

  // Calcular dimensiones del SVG - Más responsivo
  const svgDimensions = useMemo(() => {
    const { minX, maxX, minY, maxY } = diagramBounds;
    
    // Calcular dimensiones base del contenido
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    // Aplicar zoom
    const scaledWidth = contentWidth * zoom;
    const scaledHeight = contentHeight * zoom;
    
    // Dimensiones mínimas y máximas responsivas
    const minWidth = Math.min(800, window.innerWidth * 0.8);
    const minHeight = Math.min(600, window.innerHeight * 0.6);
    const maxWidth = window.innerWidth * 0.95;
    const maxHeight = window.innerHeight * 0.8;
    
    const width = Math.max(minWidth, Math.min(maxWidth, scaledWidth + 100));
    const height = Math.max(minHeight, Math.min(maxHeight, scaledHeight + 100));
    
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

  const autoFitDiagram = () => {
    const { minX, maxX, minY, maxY } = diagramBounds;
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    if (contentWidth === 0 || contentHeight === 0) return;
    
    // Calcular zoom para que el contenido quepa en el viewport
    const viewportWidth = window.innerWidth * 0.9;
    const viewportHeight = window.innerHeight * 0.7;
    
    const scaleX = viewportWidth / contentWidth;
    const scaleY = viewportHeight / contentHeight;
    const optimalZoom = Math.min(scaleX, scaleY, 2); // Máximo 2x zoom
    
    setZoom(Math.max(0.3, optimalZoom));
    centerDiagram();
  };

  // Auto-ajustar cuando cambien los filtros
  useEffect(() => {
    if (autoFit) {
      const timer = setTimeout(() => {
        autoFitDiagram();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [filteredTasks, showOnlyCriticalPath, showSimplifiedView, filterByStatus, autoFit]);

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
    const isCritical = calculateCriticalPath.criticalTasks.some(critical => critical.id === task.id);
    const isMilestone = task.isMilestone;

    // Colores basados en el estado
    let nodeColor = '#3B82F6'; // Azul por defecto
    let borderColor = '#1D4ED8'; // Borde azul por defecto
    let textColor = '#FFFFFF'; // Texto blanco por defecto
    
    if (isCritical) {
      nodeColor = '#EF4444'; // Rojo para críticas
      borderColor = '#DC2626';
      textColor = '#FFFFFF';
    } else if (isMilestone) {
      nodeColor = '#8B5CF6'; // Púrpura para milestones
      borderColor = '#7C3AED';
      textColor = '#FFFFFF';
    } else if (task.status === 'completed') {
      nodeColor = '#10B981'; // Verde para completadas
      borderColor = '#059669';
      textColor = '#FFFFFF';
    } else if (task.status === 'delayed') {
      nodeColor = '#F59E0B'; // Amarillo para retrasadas
      borderColor = '#D97706';
      textColor = '#FFFFFF';
    }

    const x = (position.x + pan.x) * zoom;
    const y = (position.y + pan.y) * zoom;
    const width = adaptiveNodeWidth * zoom;
    const height = adaptiveNodeHeight * zoom;

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
          stroke={isSelected ? '#F59E0B' : isHovered ? '#FBBF24' : borderColor}
          strokeWidth={isSelected ? 4 * zoom : isHovered ? 3 * zoom : isCritical ? 3 * zoom : 2 * zoom}
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
          fontSize={Math.max(10, 12 * zoom)}
          fill={textColor}
          fontWeight="bold"
          className="select-none"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
        >
          {showSimplifiedView ? 
            (task.name.length > 12 ? task.name.substring(0, 12) + '...' : task.name) :
            (task.name.length > 15 ? task.name.substring(0, 15) + '...' : task.name)
          }
        </text>

        {/* Información adicional */}
        {!showSimplifiedView && (
          <text
            x={x + width / 2}
            y={y + height / 2 + 15 * zoom}
            textAnchor="middle"
            fontSize={Math.max(8, 10 * zoom)}
            fill={textColor}
            opacity={0.9}
            className="select-none"
            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
          >
            {task.duration || 1}d | {task.progress || 0}%
          </text>
        )}

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

    return filteredTasks.map(task => {
      if (!task.predecessors || task.predecessors.length === 0) return null;

      return task.predecessors.map(predId => {
        const predTask = filteredTasks.find(t => t.id === predId);
        const predPos = nodePositions[predId];
        const currentPos = nodePositions[task.id];

        if (!predTask || !predPos || !currentPos) return null;

        const startX = (predPos.x + adaptiveNodeWidth / 2 + pan.x) * zoom;
        const startY = (predPos.y + adaptiveNodeHeight / 2 + pan.y) * zoom;
        const endX = (currentPos.x + adaptiveNodeWidth / 2 + pan.x) * zoom;
        const endY = (currentPos.y + adaptiveNodeHeight / 2 + pan.y) * zoom;

        // Calcular punto de conexión en el borde del nodo
        const dx = endX - startX;
        const dy = endY - startY;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length === 0) return null;

        const unitX = dx / length;
        const unitY = dy / length;

        const adjustedStartX = startX + unitX * (adaptiveNodeWidth / 2 + 5) * zoom;
        const adjustedStartY = startY + unitY * (adaptiveNodeHeight / 2 + 5) * zoom;
        const adjustedEndX = endX - unitX * (adaptiveNodeWidth / 2 + 5) * zoom;
        const adjustedEndY = endY - unitY * (adaptiveNodeHeight / 2 + 5) * zoom;

        const isCritical = calculateCriticalPath.criticalTasks.some(critical => critical.id === task.id) && 
                           calculateCriticalPath.criticalTasks.some(critical => critical.id === predTask.id);

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
      <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
        {/* Controles de zoom y navegación */}
        <div className="flex items-center justify-between">
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
            <button
              onClick={autoFitDiagram}
              className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
              title="Auto Ajustar"
            >
              📐
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

        {/* Controles de filtros */}
        <div className="flex items-center space-x-4 flex-wrap">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Filtros:</label>
            <button
              onClick={() => setShowOnlyCriticalPath(!showOnlyCriticalPath)}
              className={`px-3 py-2 rounded-lg transition-colors ${
                showOnlyCriticalPath 
                  ? 'bg-red-100 text-red-700 border-2 border-red-300' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🔥 Solo Ruta Crítica
            </button>
            <button
              onClick={() => setShowSimplifiedView(!showSimplifiedView)}
              className={`px-3 py-2 rounded-lg transition-colors ${
                showSimplifiedView 
                  ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              👁️ Vista Simplificada
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Estado:</label>
            <select
              value={filterByStatus}
              onChange={(e) => setFilterByStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todas</option>
              <option value="critical">Críticas</option>
              <option value="in-progress">En Proceso</option>
              <option value="completed">Completadas</option>
              <option value="delayed">Retrasadas</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Layout:</label>
            <select
              value={currentLayout}
              onChange={(e) => setCurrentLayout(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="hierarchical">Jerárquico</option>
              <option value="compact">Compacto</option>
              <option value="grid">Cuadrícula</option>
              <option value="radial">Radial</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={autoFit}
                onChange={(e) => setAutoFit(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Auto Ajustar</span>
            </label>
          </div>
        </div>
      </div>

      {/* Leyenda */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-gray-700">Leyenda</h4>
          {calculateCriticalPath.criticalTasks.length > 0 && (
            <div className="text-sm text-red-600 font-medium">
              🔥 Ruta Crítica: {calculateCriticalPath.criticalTasks.length} tareas
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded border-2 border-blue-600"></div>
            <span>Tareas normales</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded border-2 border-red-600 border-dashed"></div>
            <span>Ruta crítica</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-purple-500 rounded border-2 border-purple-600"></div>
            <span>Milestones</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded border-2 border-green-600"></div>
            <span>Completadas</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-500 rounded border-2 border-yellow-600"></div>
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
          {filteredTasks.map(renderNode)}
        </svg>
      </div>

      {/* Información del diagrama */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="font-semibold text-gray-700">Tareas Mostradas</div>
            <div className="text-2xl font-bold text-blue-600">{filteredTasks.length}</div>
            <div className="text-xs text-gray-500">de {tasks?.length || 0} total</div>
          </div>
          <div>
            <div className="font-semibold text-gray-700">Tareas Críticas</div>
            <div className="text-2xl font-bold text-red-600">
              {calculateCriticalPath.criticalTasks.length}
            </div>
            <div className="text-xs text-gray-500">ruta crítica</div>
          </div>
          <div>
            <div className="font-semibold text-gray-700">Milestones</div>
            <div className="text-2xl font-bold text-purple-600">
              {filteredTasks.filter(t => t.isMilestone).length}
            </div>
            <div className="text-xs text-gray-500">mostrados</div>
          </div>
          <div>
            <div className="font-semibold text-gray-700">Dependencias</div>
            <div className="text-2xl font-bold text-gray-600">
              {filteredTasks.reduce((sum, t) => sum + (t.predecessors?.length || 0), 0)}
            </div>
            <div className="text-xs text-gray-500">conexiones</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkDiagram;
