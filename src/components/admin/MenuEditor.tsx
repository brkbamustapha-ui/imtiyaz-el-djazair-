"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveMenuAction, type MenuItemInput } from "@/app/admin/actions/navigation";
import type { MenuNode } from "@/server/content";
import { readLocalized } from "@/lib/localized-field";
import type { Locale, LocalizedText } from "@/lib/i18n";
import { LocalizedInput } from "./LocalizedInput";
import { Icon } from "@/components/ui/Icon";
import { Card, Notice, Spinner } from "./ui";
import { cn } from "@/lib/utils";

type Row = MenuItemInput & { children: MenuItemInput[] };

function asLocalized(raw: string): LocalizedText {
  const parsed = readLocalized(raw);
  return typeof parsed === "string" ? { en: parsed } : parsed;
}

function toRows(nodes: MenuNode[]): Row[] {
  return nodes.map((node) => ({
    label: asLocalized(node.label),
    href: node.href,
    openInNewTab: node.openInNewTab,
    isActive: true,
    children: node.children.map((child) => ({
      label: asLocalized(child.label),
      href: child.href,
      openInNewTab: child.openInNewTab,
      isActive: true,
      children: [],
    })),
  }));
}

export function MenuEditor({
  initial,
  suggestions,
  locales,
}: {
  initial: MenuNode[];
  suggestions: { label: string; href: string }[];
  locales: Locale[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(toRows(initial));
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const update = (index: number, patch: Partial<Row>) =>
    setRows((current) => current.map((row, position) => (position === index ? { ...row, ...patch } : row)));

  const updateChild = (index: number, childIndex: number, patch: Partial<MenuItemInput>) =>
    setRows((current) =>
      current.map((row, position) =>
        position === index
          ? {
              ...row,
              children: row.children.map((child, childPosition) =>
                childPosition === childIndex ? { ...child, ...patch } : child,
              ),
            }
          : row,
      ),
    );

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    setRows(next);
  };

  const save = () => {
    startTransition(async () => {
      const result = await saveMenuAction("header", rows);
      setMessage({ ok: result.ok, text: result.message });
      router.refresh();
    });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
      <Card title="Header menu">
        <ul className="space-y-2 p-4">
          {rows.map((row, index) => (
            <li
              key={index}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (dragIndex === null || dragIndex === index) return;
                const next = [...rows];
                const [moved] = next.splice(dragIndex, 1);
                next.splice(index, 0, moved);
                setDragIndex(null);
                setRows(next);
              }}
              onDragEnd={() => setDragIndex(null)}
              className={cn(
                "rounded-[var(--a-radius-sm)] border border-[var(--a-line)] bg-[var(--a-panel-2)] p-3",
                dragIndex === index && "a-row-dragging",
                !row.isActive && "opacity-60",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="a-drag-handle" aria-hidden>
                  <Icon name="drag" size={15} />
                </span>
                <LocalizedInput
                  value={row.label}
                  locales={locales}
                  placeholder="Label"
                  ariaLabel={`Menu item ${index + 1} label`}
                  onChange={(label) => update(index, { label })}
                />
                <input
                  className="a-input a-mono min-w-[140px] flex-1"
                  value={row.href}
                  onChange={(event) => update(index, { href: event.target.value })}
                  placeholder="/about"
                  aria-label={`Menu item ${index + 1} link`}
                />
                <button
                  type="button"
                  className="a-btn a-btn-ghost a-btn-icon"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label="Move up"
                >
                  <Icon name="chevronDown" size={14} className="rotate-180" />
                </button>
                <button
                  type="button"
                  className="a-btn a-btn-ghost a-btn-icon"
                  onClick={() => move(index, 1)}
                  disabled={index === rows.length - 1}
                  aria-label="Move down"
                >
                  <Icon name="chevronDown" size={14} />
                </button>
                <button
                  type="button"
                  className="a-btn a-btn-ghost a-btn-icon text-[var(--a-danger)]"
                  onClick={() => setRows(rows.filter((_, position) => position !== index))}
                  aria-label="Remove"
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-4 ps-6 text-[0.76rem]">
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-[var(--a-brand)]"
                    checked={row.isActive}
                    onChange={(event) => update(index, { isActive: event.target.checked })}
                  />
                  Visible
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-[var(--a-brand)]"
                    checked={row.openInNewTab}
                    onChange={(event) => update(index, { openInNewTab: event.target.checked })}
                  />
                  Open in a new tab
                </label>
                <button
                  type="button"
                  className="a-btn a-btn-ghost a-btn-sm !py-0"
                  onClick={() =>
                    update(index, {
                      children: [
                        ...row.children,
                        { label: { en: "New item" }, href: "/", openInNewTab: false, isActive: true },
                      ],
                    })
                  }
                >
                  <Icon name="plus" size={12} />
                  Sub-item
                </button>
              </div>

              {row.children.length > 0 && (
                <ul className="mt-2 space-y-1.5 border-s border-[var(--a-line)] ps-4">
                  {row.children.map((child, childIndex) => (
                    <li key={childIndex} className="flex flex-wrap items-center gap-2">
                      <LocalizedInput
                        value={child.label}
                        locales={locales}
                        ariaLabel="Sub-item label"
                        onChange={(label) => updateChild(index, childIndex, { label })}
                      />
                      <input
                        className="a-input a-mono min-w-[130px] flex-1"
                        value={child.href}
                        onChange={(event) => updateChild(index, childIndex, { href: event.target.value })}
                        aria-label="Sub-item link"
                      />
                      <button
                        type="button"
                        className="a-btn a-btn-ghost a-btn-icon text-[var(--a-danger)]"
                        onClick={() =>
                          update(index, {
                            children: row.children.filter((_, position) => position !== childIndex),
                          })
                        }
                        aria-label="Remove sub-item"
                      >
                        <Icon name="trash" size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-2 border-t border-[var(--a-line)] p-4">
          <button
            type="button"
            className="a-btn a-btn-outline a-btn-sm"
            onClick={() =>
              setRows([
                ...rows,
                { label: { en: "New item" }, href: "/", openInNewTab: false, isActive: true, children: [] },
              ])
            }
          >
            <Icon name="plus" size={14} />
            Add item
          </button>
          <span className="flex-1" />
          <button type="button" className="a-btn a-btn-primary" onClick={save} disabled={pending || rows.length === 0}>
            {pending && <Spinner />}
            Save menu
          </button>
        </div>

        {message && (
          <div className="border-t border-[var(--a-line)] p-4">
            <Notice tone={message.ok ? "success" : "danger"}>{message.text}</Notice>
          </div>
        )}
      </Card>

      <Card title="Quick add" description="Published pages you can drop into the menu.">
        <ul className="space-y-1.5 p-4">
          {suggestions.map((suggestion) => (
            <li key={suggestion.href}>
              <button
                type="button"
                className="a-btn a-btn-ghost a-btn-sm w-full !justify-start"
                onClick={() =>
                  setRows([
                    ...rows,
                    {
                      label: { en: suggestion.label },
                      href: suggestion.href,
                      openInNewTab: false,
                      isActive: true,
                      children: [],
                    },
                  ])
                }
              >
                <Icon name="plus" size={13} />
                <span className="truncate">{suggestion.label}</span>
                <code className="a-mono ms-auto truncate text-[0.68rem] text-[var(--a-faint)]">
                  {suggestion.href}
                </code>
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
