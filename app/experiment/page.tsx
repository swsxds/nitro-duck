'use client';

import React, { useState } from 'react';
import operationsJson from './operations.json';
import jsPDF from 'jspdf';

/* ---------- Типы ---------- */

interface ParameterDefinition {
  name: string;
  type: string;
  required?: boolean;
  units?: string[];
  options?: string[];
}

interface AtomicOperation {
  id: number;
  name: string;
  category: string;
  parameters: ParameterDefinition[];
  example?: string;
}

interface OperationsFile {
  atomic_operations: AtomicOperation[];
  metadata: {
    categories: string[];
  };
}

interface OperationStep {
  instanceId: string;
  operationId: number;
  operationName: string;
  category: string;
  parameters: ParameterDefinition[];
  values: Record<string, any>;
}

type DragPayload =
  | { source: 'left'; operationId: number }
  | { source: 'right'; instanceId: string };

/* ---------- Данные из JSON ---------- */

const operationsData = operationsJson as OperationsFile;
const atomicOperations: AtomicOperation[] = operationsData.atomic_operations;
const categories: string[] = operationsData.metadata.categories;

// операции по категориям
const operationsByCategory: Record<string, AtomicOperation[]> = {};
const operationById = new Map<number, AtomicOperation>();

for (const cat of categories) {
  operationsByCategory[cat] = [];
}

for (const op of atomicOperations) {
  operationById.set(op.id, op);
  if (!operationsByCategory[op.category]) {
    operationsByCategory[op.category] = [];
  }
  operationsByCategory[op.category].push(op);
}

// сортируем операции в категории по id
for (const cat of Object.keys(operationsByCategory)) {
  operationsByCategory[cat].sort((a, b) => a.id - b.id);
}

// по умолчанию все категории с операциями раскрыты
const defaultExpandedCategories: Record<string, boolean> = {};
for (const cat of categories) {
  const ops = operationsByCategory[cat];
  if (ops && ops.length) {
    defaultExpandedCategories[cat] = true;
  }
}

/* ---------- Хелперы ---------- */

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function fromSnakeCase(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}

function formatCategoryLabel(category: string): string {
  const suffix = '_OPERATIONS';
  const base = category.endsWith(suffix)
    ? category.slice(0, -suffix.length)
    : category;
  return fromSnakeCase(base);
}

function formatOperationLabel(name: string): string {
  return fromSnakeCase(name);
}

function formatParameterLabel(param: ParameterDefinition): string {
  const base = fromSnakeCase(param.name);
  return param.required ? `${base} *` : base;
}

function formatParameterValue(rawType: string, value: any): string {
  if (value === null || value === undefined || value === '') return '—';

  // number + unit: храним как { numericValue, unit }
  if (rawType === 'number + unit' && typeof value === 'object') {
    const numericValue = (value as any).numericValue ?? '';
    const unit = (value as any).unit ?? '';
    const text = `${numericValue} ${unit}`.trim();
    return text || '—';
  }

  // Прочие объекты — в JSON
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
}


function parseDragPayload(event: React.DragEvent): DragPayload | null {
  const json = event.dataTransfer.getData('application/json');
  if (!json) return null;
  try {
    return JSON.parse(json) as DragPayload;
  } catch {
    return null;
  }
}

/* ---------- Компонент страницы ---------- */

export default function Page() {
  const [header, setHeader] = useState('');
  const [steps, setSteps] = useState<OperationStep[]>([]);
  const [expandedCategories, setExpandedCategories] =
    useState<Record<string, boolean>>(defaultExpandedCategories);

  /* ---- работа с категориями слева ---- */

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleOperationDragStart =
    (operationId: number) => (event: React.DragEvent<HTMLDivElement>) => {
      const payload: DragPayload = { source: 'left', operationId };
      event.dataTransfer.setData('application/json', JSON.stringify(payload));
      event.dataTransfer.effectAllowed = 'copy';
    };

  /* ---- шаги справа ---- */

  const handleStepDragStart =
    (instanceId: string) => (event: React.DragEvent<HTMLDivElement>) => {
      const payload: DragPayload = { source: 'right', instanceId };
      event.dataTransfer.setData('application/json', JSON.stringify(payload));
      event.dataTransfer.effectAllowed = 'move';
    };

  const addStepAtIndex = (operationId: number, index: number) => {
    const op = operationById.get(operationId);
    if (!op) return;
    const newStep: OperationStep = {
      instanceId: createId(),
      operationId: op.id,
      operationName: op.name,
      category: op.category,
      parameters: op.parameters || [],
      values: {},
    };
    setSteps((prev) => {
      const copy = [...prev];
      copy.splice(index, 0, newStep);
      return copy;
    });
  };

  const moveStepToIndex = (instanceId: string, targetIndex: number) => {
    setSteps((prev) => {
      const currentIndex = prev.findIndex(
        (step) => step.instanceId === instanceId,
      );
      if (currentIndex === -1 || currentIndex === targetIndex) return prev;

      const updated = [...prev];
      const [moved] = updated.splice(currentIndex, 1);

      let newIndex = targetIndex;
      if (currentIndex < targetIndex) {
        newIndex = targetIndex - 1;
      }

      updated.splice(newIndex, 0, moved);
      return updated;
    });
  };

  const handleDropOnRightList = (
    event: React.DragEvent<HTMLDivElement>,
  ): void => {
    event.preventDefault();
    const payload = parseDragPayload(event);
    if (!payload) return;

    if (payload.source === 'left') {
      addStepAtIndex(payload.operationId, steps.length);
    } else if (payload.source === 'right') {
      moveStepToIndex(payload.instanceId, steps.length);
    }
  };

  const handleDropOnStep =
    (targetIndex: number) => (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const payload = parseDragPayload(event);
      if (!payload) return;

      if (payload.source === 'left') {
        addStepAtIndex(payload.operationId, targetIndex);
      } else if (payload.source === 'right') {
        moveStepToIndex(payload.instanceId, targetIndex);
      }
    };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const updateStepParameterValue = (
    instanceId: string,
    paramName: string,
    newValue: any,
  ) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.instanceId === instanceId
          ? {
              ...step,
              values: {
                ...step.values,
                [paramName]: newValue,
              },
            }
          : step,
      ),
    );
  };

  const handleRemoveStep = (instanceId: string) => {
    setSteps((prev) => prev.filter((step) => step.instanceId !== instanceId));
  };

const handleSave = () => {
  // 1) Готовим payload как раньше (на будущее, для бэка)
  const payload = {
    header,
    steps: steps.map((step) => ({
      instanceId: step.instanceId,
      operationId: step.operationId,
      operationName: step.operationName,
      category: step.category,
      parameters: step.parameters.map((p) => ({
        name: p.name,
        type: p.type,
        required: p.required ?? false,
        value: step.values[p.name] ?? null,
      })),
    })),
  };

  console.log('Protocol payload:', payload);

  // 2) Генерируем PDF
  const doc = new jsPDF();

  const lineHeight = 6;
  const maxWidth = 180; // ширина текста (A4 width ~210 - поля)
  let y = 20;

  const title = header || 'Untitled protocol';

  // Заголовок
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 105, y, { align: 'center' });
  y += lineHeight * 2;

  // Метаданные
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Generated on: ${new Date().toLocaleString()}`,
    14,
    y,
  );
  y += lineHeight;
  doc.text(`Number of steps: ${steps.length}`, 14, y);
  y += lineHeight * 2;

  // Раздел Steps
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Steps', 14, y);
  y += lineHeight;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  const addPageIfNeeded = () => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  };

  steps.forEach((step, index) => {
    addPageIfNeeded();

    // Заголовок шага
    const stepTitle = `Step ${index + 1}: ${formatOperationLabel(
      step.operationName,
    )}`;
    const stepTitleLines = doc.splitTextToSize(stepTitle, maxWidth);

    doc.setFont('helvetica', 'bold');
    doc.text(stepTitleLines, 14, y);
    y += lineHeight * stepTitleLines.length;

    // Категория
    doc.setFont('helvetica', 'normal');
    const categoryLine = `Category: ${formatCategoryLabel(step.category)}`;
    const categoryLines = doc.splitTextToSize(categoryLine, maxWidth);
    doc.text(categoryLines, 14, y);
    y += lineHeight * categoryLines.length;

    // Параметры
    if (step.parameters.length > 0) {
      y += 2;
      doc.text('Parameters:', 14, y);
      y += lineHeight;

      step.parameters.forEach((param) => {
        addPageIfNeeded();
        const name = formatParameterLabel(param);
        const rawType = param.type;
        const value = formatParameterValue(
          rawType,
          step.values[param.name],
        );

        const line = `• ${name}: ${value}`;
        const lines = doc.splitTextToSize(line, maxWidth);
        doc.text(lines, 18, y);
        y += lineHeight * lines.length;
      });
    }

    // Разделительная линия между шагами
    y += 10; // ⬅ adds ~10px space before the line
doc.setDrawColor(200);
doc.line(14, y, 196, y);
y += 10;
  });

  // 3) Скачать PDF
  const fileName =
    (header || 'protocol').replace(/\s+/g, '_').replace(/[^\w\-]/g, '') +
    '.pdf';
  doc.save(fileName);
};


  /* ---- Рендер параметров операции в правой колонке ---- */

  const renderSingleParameter = (
    step: OperationStep,
    param: ParameterDefinition,
  ) => {
    const label = formatParameterLabel(param);
    const key = param.name;
    const rawType = param.type;
    const type = rawType.toLowerCase();
    const current = step.values[key];

    // boolean -> checkbox
    if (type === 'boolean') {
      const checked = current === true || current === 'true';
      return (
        <label style={checkboxLabelStyle}>
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) =>
              updateStepParameterValue(step.instanceId, key, e.target.checked)
            }
            style={{ marginRight: 6 }}
          />
          <span>{label}</span>
        </label>
      );
    }

    // если есть options -> select
    if (param.options && param.options.length) {
      const value = typeof current === 'string' ? current : '';
      return (
        <div>
          <div style={labelStyle}>{label}</div>
          <select
            style={inputStyle}
            value={value}
            onChange={(e) =>
              updateStepParameterValue(step.instanceId, key, e.target.value)
            }
          >
            <option value="">Select...</option>
            {param.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      );
    }

    // "сложные" типы -> textarea
    const isMultiLine =
      type.includes('array') ||
      type.includes('list') ||
      type.includes('dict') ||
      type.includes('expression') ||
      type.includes('free text') ||
      type.includes('estimated time') ||
      type.includes('additional tips') ||
      type.includes('string or dict') ||
      type.includes('reference image path') ||
      type.includes('reference video path');

    if (isMultiLine) {
      const value = typeof current === 'string' ? current : '';
      return (
        <div>
          <div style={labelStyle}>{label}</div>
          <textarea
            style={textareaStyle}
            value={value}
            onChange={(e) =>
              updateStepParameterValue(step.instanceId, key, e.target.value)
            }
            rows={3}
          />
        </div>
      );
    }

    // number + unit
    if (rawType === 'number + unit') {
      const obj = (current as any) || {};
      const numericValue = obj.numericValue ?? '';
      const unitValue = obj.unit ?? (param.units?.[0] ?? '');

      return (
        <div>
          <div style={labelStyle}>{label}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="number"
              style={{ ...inputStyle, flex: 2 }}
              value={numericValue}
              onChange={(e) =>
                updateStepParameterValue(step.instanceId, key, {
                  ...obj,
                  numericValue: e.target.value,
                })
              }
            />
            {param.units && param.units.length ? (
              <select
                style={{ ...inputStyle, flex: 1 }}
                value={unitValue}
                onChange={(e) =>
                  updateStepParameterValue(step.instanceId, key, {
                    ...obj,
                    unit: e.target.value,
                  })
                }
              >
                {param.units.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            ) : (
              <input
                style={{ ...inputStyle, flex: 1 }}
                placeholder="unit"
                value={unitValue}
                onChange={(e) =>
                  updateStepParameterValue(step.instanceId, key, {
                    ...obj,
                    unit: e.target.value,
                  })
                }
              />
            )}
          </div>
        </div>
      );
    }

    // number + °C
    if (rawType === 'number + °C') {
      const value =
        typeof current === 'number' || typeof current === 'string'
          ? current
          : '';
      return (
        <div>
          <div style={labelStyle}>{label}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="number"
              style={{ ...inputStyle, flex: 1 }}
              value={value}
              onChange={(e) =>
                updateStepParameterValue(step.instanceId, key, e.target.value)
              }
            />
            <span style={inlineUnitTextStyle}>°C</span>
          </div>
        </div>
      );
    }

    // number + rpm
    if (rawType === 'number + rpm') {
      const value =
        typeof current === 'number' || typeof current === 'string'
          ? current
          : '';
      return (
        <div>
          <div style={labelStyle}>{label}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="number"
              style={{ ...inputStyle, flex: 1 }}
              value={value}
              onChange={(e) =>
                updateStepParameterValue(step.instanceId, key, e.target.value)
              }
            />
            <span style={inlineUnitTextStyle}>rpm</span>
          </div>
        </div>
      );
    }

    // percentage
    if (rawType === 'percentage') {
      const value =
        typeof current === 'number' || typeof current === 'string'
          ? current
          : '';
      return (
        <div>
          <div style={labelStyle}>{label}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="number"
              style={{ ...inputStyle, flex: 1 }}
              value={value}
              onChange={(e) =>
                updateStepParameterValue(step.instanceId, key, e.target.value)
              }
            />
            <span style={inlineUnitTextStyle}>%</span>
          </div>
        </div>
      );
    }

    // number + unit or days -> свободная строка
    if (rawType === 'number + unit or days') {
      const value = typeof current === 'string' ? current : '';
      return (
        <div>
          <div style={labelStyle}>{label}</div>
          <input
            style={inputStyle}
            value={value}
            placeholder="e.g. 3 days or 72 h"
            onChange={(e) =>
              updateStepParameterValue(step.instanceId, key, e.target.value)
            }
          />
        </div>
      );
    }

    // просто number
    if (rawType === 'number') {
      const value =
        typeof current === 'number' || typeof current === 'string'
          ? current
          : '';
      return (
        <div>
          <div style={labelStyle}>{label}</div>
          <input
            type="number"
            style={inputStyle}
            value={value}
            onChange={(e) =>
              updateStepParameterValue(step.instanceId, key, e.target.value)
            }
          />
        </div>
      );
    }

    // дефолт: обычный текст
    const value = typeof current === 'string' ? current : '';
    return (
      <div>
        <div style={labelStyle}>{label}</div>
        <input
          style={inputStyle}
          value={value}
          onChange={(e) =>
            updateStepParameterValue(step.instanceId, key, e.target.value)
          }
        />
      </div>
    );
  };

  const renderParameterInputs = (step: OperationStep) => {
    if (!step.parameters || step.parameters.length === 0) return null;
    return (
      <div style={parameterListStyle}>
        {step.parameters.map((param) => (
          <div key={param.name} style={parameterRowStyle}>
            {renderSingleParameter(step, param)}
          </div>
        ))}
      </div>
    );
  };

  /* ---- JSX ---- */

  return (
    <div style={containerStyle}>
      {/* Левая колонка: категории и операции */}
      <div style={leftColumnStyle}>
        <h1 style={{ marginBottom: 12 }}>Operations</h1>
        <p style={{ fontSize: 12, marginBottom: 12 }}>
          Drag & Drop
        </p>

        {categories.map((category) => {
          const ops = operationsByCategory[category];
          if (!ops || ops.length === 0) return null;

          const expanded = !expandedCategories[category];

          return (
            <div key={category} style={categoryBlockStyle}>
              <div
                style={categoryHeaderStyle}
                onClick={() => toggleCategory(category)}
              >
                <span style={{ marginRight: 6 }}>
                  {expanded ? '▾' : '▸'}
                </span>
                <span>{formatCategoryLabel(category)}</span>
              </div>

              {expanded && (
                <div style={operationListStyle}>
                  {ops.map((op) => (
                    <div
                      key={op.id}
                      draggable
                      onDragStart={handleOperationDragStart(op.id)}
                      style={operationItemStyle}
                    >
                      {formatOperationLabel(op.name)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Черная вертикальная линия */}
      <div style={dividerStyle} />

      {/* Правая колонка: протокол */}
      <div style={rightColumnStyle}>
        <h1 style={{ marginBottom: 8 }}>Protocol</h1>
        <label style={{ fontSize: 12, marginBottom: 4 }}>
          Experiment Name
        </label>
        <input
          style={{ ...inputStyle, marginBottom: 12 }}
          value={header}
          onChange={(e) => setHeader(e.target.value)}
          placeholder="Enter experiment name..."
        />

        <div
          style={rightListStyle}
          onDragOver={handleDragOver}
          onDrop={handleDropOnRightList}
        >
          {steps.length === 0 && (
            <div style={{ fontSize: 12, color: '#777' }}>
              Drag & Drop here
            </div>
          )}

          {steps.map((step, index) => (
            <div
              key={step.instanceId}
              draggable
              onDragStart={handleStepDragStart(step.instanceId)}
              onDragOver={handleDragOver}
              onDrop={handleDropOnStep(index)}
              style={rightCardStyle}
            >
              <div style={stepCardHeaderStyle}>
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {formatOperationLabel(step.operationName)}
                  </div>
                  <div style={stepCategoryLabelStyle}>
                    {formatCategoryLabel(step.category)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveStep(step.instanceId)}
                  style={removeButtonStyle}
                >
                  ✕
                </button>
              </div>

              {renderParameterInputs(step)}
            </div>
          ))}
        </div>

        <button style={saveButtonStyle} onClick={handleSave}>
          Save
        </button>
      </div>
    </div>
  );
}

/* ---------- Стили ---------- */

const containerStyle: React.CSSProperties = {
  display: 'flex',
  height: '100vh',
  boxSizing: 'border-box',
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
};

const leftColumnStyle: React.CSSProperties = {
  flex: '0 0 40%',
  padding: 16,
  boxSizing: 'border-box',
  overflowY: 'auto',
};

const rightColumnStyle: React.CSSProperties = {
  flex: '0 0 60%',
  padding: 16,
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
};

const dividerStyle: React.CSSProperties = {
  width: 2,
  backgroundColor: '#000',
};

const categoryBlockStyle: React.CSSProperties = {
  marginBottom: 10,
  borderRadius: 8,
  border: '1px solid #ccc',
  backgroundColor: '#f5f5f5',
  overflow: 'hidden',
};

const categoryHeaderStyle: React.CSSProperties = {
  padding: '8px 10px',
  cursor: 'pointer',
  userSelect: 'none',
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
};

const operationListStyle: React.CSSProperties = {
  padding: '6px 8px 8px',
};

const operationItemStyle: React.CSSProperties = {
  padding: '8px 10px',
  marginBottom: 6,
  borderRadius: 6,
  border: '1px solid #ddd',
  backgroundColor: '#ffffff',
  cursor: 'grab',
  userSelect: 'none',
};

const rightListStyle: React.CSSProperties = {
  flex: 1,
  padding: 8,
  borderRadius: 8,
  border: '1px dashed #bbb',
  backgroundColor: '#fafafa',
  overflowY: 'auto',
  minHeight: 0,
};

const rightCardStyle: React.CSSProperties = {
  padding: 10,
  marginBottom: 8,
  borderRadius: 8,
  border: '1px solid #ccc',
  backgroundColor: '#ffffff',
  cursor: 'move',
  boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
};

const stepCardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 6,
};

const stepCategoryLabelStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#666',
};

const parameterListStyle: React.CSSProperties = {
  marginTop: 8,
};

const parameterRowStyle: React.CSSProperties = {
  marginBottom: 8,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  borderRadius: 4,
  border: '1px solid #ccc',
  fontSize: 13,
  boxSizing: 'border-box',
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: 'vertical',
};

const checkboxLabelStyle: React.CSSProperties = {
  fontSize: 13,
  display: 'flex',
  alignItems: 'center',
};

const inlineUnitTextStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#555',
  minWidth: 30,
};

const saveButtonStyle: React.CSSProperties = {
  marginTop: 12,
  padding: '8px 12px',
  borderRadius: 6,
  border: 'none',
  backgroundColor: '#000',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 500,
  width: '100%',
};

const removeButtonStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: 16,
  lineHeight: 1,
};
