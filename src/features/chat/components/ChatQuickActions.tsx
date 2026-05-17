interface QuickAction {
  label: string;
  message: string;
}

interface ChatQuickActionsProps {
  actions: QuickAction[];
  onAction: (message: string) => void;
  accentColor: string;
  whatsappFallback?: string | null;
}

export function ChatQuickActions({ actions, onAction, accentColor, whatsappFallback }: ChatQuickActionsProps) {
  const handleClick = (action: QuickAction) => {
    if (action.message === "__whatsapp__" && whatsappFallback) {
      const url = `https://wa.me/${whatsappFallback.replace(/\D/g, "")}`;
      window.open(url, "_blank");
      return;
    }
    onAction(action.message);
  };

  return (
    <div className="flex flex-wrap gap-1.5 mt-2 ml-9">
      {actions.map((action, i) => (
        <button
          key={i}
          onClick={() => handleClick(action)}
          className="rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:text-white"
          style={{
            borderColor: accentColor,
            color: accentColor,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = accentColor;
            e.currentTarget.style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = accentColor;
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
