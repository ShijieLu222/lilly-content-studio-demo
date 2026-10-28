import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { MouseEvent, RefObject } from "react";
import { createPortal } from "react-dom";
import { ArchiveRestore, FileImage, Film, Trash2, X } from "lucide-react";
import "./ProjectActions.css";

type ActionProject = { id: string; title: string; kind: "article" | "video" };

export type ProjectActionsProps = {
  menu: { project: ActionProject; x: number; y: number } | null;
  onCloseMenu: () => void;
  onDelete: (id: string) => void;
  trashOpen: boolean;
  trashedProjects: ActionProject[];
  onCloseTrash: () => void;
  onRestore: (id: string) => void;
};

function useModal(
  ref: RefObject<HTMLDialogElement | null>,
  open: boolean,
  returnFocus?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    if (!dialog.open) dialog.showModal();
    dialog.querySelector<HTMLElement>("[data-initial-focus]")?.focus();
    return () => {
      if (dialog.open) dialog.close();
      const target = returnFocus?.current ?? previous;
      if (target?.isConnected) target.focus();
    };
  }, [open, ref, returnFocus]);
}

function backdropClick(
  event: MouseEvent<HTMLDialogElement>,
  close: () => void,
) {
  if (event.target !== event.currentTarget) return;
  const rect = event.currentTarget.getBoundingClientRect();
  if (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  )
    close();
}

export default function ProjectActions({
  menu,
  onCloseMenu,
  onDelete,
  trashOpen,
  trashedProjects,
  onCloseTrash,
  onRestore,
}: ProjectActionsProps) {
  const [confirm, setConfirm] = useState<ActionProject | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [trashError, setTrashError] = useState("");
  const [restored, setRestored] = useState("");
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const confirmRef = useRef<HTMLDialogElement>(null);
  const trashRef = useRef<HTMLDialogElement>(null);
  const closeMenuRef = useRef(onCloseMenu);
  closeMenuRef.current = onCloseMenu;

  useLayoutEffect(() => {
    if (!menu) return;
    if (!menuRef.current?.contains(document.activeElement))
      triggerRef.current = document.activeElement as HTMLElement | null;
    const rect = menuRef.current?.getBoundingClientRect();
    setPosition({
      x: Math.max(
        8,
        Math.min(menu.x, window.innerWidth - (rect?.width ?? 196) - 8),
      ),
      y: Math.max(
        8,
        Math.min(menu.y, window.innerHeight - (rect?.height ?? 56) - 8),
      ),
    });
    menuButtonRef.current?.focus();
    const outside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node))
        closeMenuRef.current();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Tab") {
        event.preventDefault();
        closeMenuRef.current();
        if (triggerRef.current?.isConnected) triggerRef.current.focus();
      }
    };
    const dismiss = () => closeMenuRef.current();
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", dismiss);
    window.addEventListener("scroll", dismiss, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("scroll", dismiss, true);
    };
  }, [menu]);

  useEffect(() => {
    if (trashOpen) {
      setTrashError("");
      setRestored("");
    }
  }, [trashOpen]);

  useModal(confirmRef, !!confirm, triggerRef);
  useModal(trashRef, trashOpen);

  function deleteConfirmed() {
    if (!confirm) return;
    try {
      onDelete(confirm.id);
      setConfirm(null);
      setDeleteError("");
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "删除失败，请重试。",
      );
    }
  }

  function restore(project: ActionProject) {
    try {
      onRestore(project.id);
      setTrashError("");
      setRestored(
        `已恢复「${project.title || "未命名创作"}」，可从最近创作继续。`,
      );
      trashRef.current
        ?.querySelector<HTMLElement>("[data-initial-focus]")
        ?.focus();
    } catch (error) {
      setTrashError(
        error instanceof Error ? error.message : "恢复失败，请重试。",
      );
    }
  }

  return createPortal(
    <>
      {menu && (
        <div
          ref={menuRef}
          className="pa-context-menu"
          role="menu"
          aria-label={`${menu.project.title || "未命名创作"}的操作`}
          style={{ left: position.x, top: position.y }}
          onContextMenu={(event) => event.preventDefault()}
        >
          <button
            ref={menuButtonRef}
            type="button"
            role="menuitem"
            onClick={() => {
              setDeleteError("");
              setConfirm(menu.project);
              onCloseMenu();
            }}
            onKeyDown={(event) => {
              if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
                event.preventDefault();
                menuButtonRef.current?.focus();
              }
            }}
          >
            <Trash2 size={16} /> 删除创作
          </button>
        </div>
      )}
      <dialog
        ref={confirmRef}
        className="pa-dialog pa-delete-dialog"
        aria-labelledby="pa-delete-heading"
        aria-describedby="pa-delete-description"
        onCancel={(event) => {
          event.preventDefault();
          setConfirm(null);
        }}
        onClick={(event) => backdropClick(event, () => setConfirm(null))}
      >
        <button
          className="pa-close"
          type="button"
          aria-label="关闭删除弹窗"
          onClick={() => setConfirm(null)}
        >
          <X size={18} />
        </button>
        <span className="pa-dialog-icon">
          <Trash2 size={24} strokeWidth={1.6} />
        </span>
        <h2 id="pa-delete-heading">删除这次创作？</h2>
        <p className="pa-project-name">{confirm?.title || "未命名创作"}</p>
        <p id="pa-delete-description">
          创作将从最近列表移入回收站，之后仍可恢复。不会删除电脑上的原始文件。
        </p>
        {deleteError && (
          <p className="pa-error" role="alert">
            {deleteError}
          </p>
        )}
        <div className="pa-dialog-actions">
          <button
            data-initial-focus
            type="button"
            className="pa-button"
            onClick={() => setConfirm(null)}
          >
            取消
          </button>
          <button
            type="button"
            className="pa-button pa-danger"
            onClick={deleteConfirmed}
          >
            <Trash2 size={14} /> 移入回收站
          </button>
        </div>
      </dialog>
      <dialog
        ref={trashRef}
        className="pa-dialog pa-trash-dialog"
        aria-labelledby="pa-trash-heading"
        aria-describedby="pa-trash-description"
        onCancel={(event) => {
          event.preventDefault();
          onCloseTrash();
        }}
        onClick={(event) => backdropClick(event, onCloseTrash)}
      >
        <button
          data-initial-focus
          className="pa-close"
          type="button"
          aria-label="关闭回收站"
          onClick={onCloseTrash}
        >
          <X size={18} />
        </button>
        <div className="pa-trash-heading">
          <span className="pa-dialog-icon">
            <Trash2 size={22} strokeWidth={1.6} />
          </span>
          <div>
            <h2 id="pa-trash-heading">回收站</h2>
            <p id="pa-trash-description">
              已删除的创作保留在此浏览器，可随时恢复。
            </p>
          </div>
        </div>
        {trashError && (
          <p className="pa-error" role="alert">
            {trashError}
          </p>
        )}
        {restored && (
          <p className="pa-restored" role="status">
            {restored}
          </p>
        )}
        {trashedProjects.length ? (
          <ul className="pa-trash-list">
            {trashedProjects.map((project) => (
              <li key={project.id}>
                <span className={`pa-project-icon ${project.kind}`}>
                  {project.kind === "article" ? (
                    <FileImage size={19} />
                  ) : (
                    <Film size={19} />
                  )}
                </span>
                <div>
                  <strong>{project.title || "未命名创作"}</strong>
                  <span>
                    {project.kind === "article" ? "图文创作" : "视频创作"}
                  </span>
                </div>
                <button
                  type="button"
                  className="pa-button"
                  aria-label={`恢复 ${project.title || "未命名创作"}`}
                  onClick={() => restore(project)}
                >
                  <ArchiveRestore size={14} /> 恢复
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="pa-trash-empty">
            <ArchiveRestore size={30} strokeWidth={1.3} />
            <h3>回收站为空</h3>
            <p>删除的创作会显示在这里。</p>
          </div>
        )}
        <div className="pa-trash-footer">
          <span>{trashedProjects.length} 项创作</span>
          <button type="button" className="pa-button" onClick={onCloseTrash}>
            完成
          </button>
        </div>
      </dialog>
    </>,
    document.body,
  );
}
