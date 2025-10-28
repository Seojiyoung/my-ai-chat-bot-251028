import { useState } from "react";
import { Card } from "@/components/ui/card";
import { FunctionCall } from "@/lib/types";
import { ChevronDown, ChevronUp, Wrench, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FunctionCallCardProps {
  functionCall: FunctionCall;
}

export function FunctionCallCard({ functionCall }: FunctionCallCardProps) {
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const [isOutputExpanded, setIsOutputExpanded] = useState(false);

  const getStatusIcon = () => {
    switch (functionCall.status) {
      case "pending":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusText = () => {
    switch (functionCall.status) {
      case "pending":
        return "실행 중...";
      case "success":
        return "성공";
      case "error":
        return "실패";
    }
  };

  return (
    <Card className={cn(
      "p-4 mb-3 border-l-4",
      functionCall.status === "pending" && "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20",
      functionCall.status === "success" && "border-l-green-500 bg-green-50/50 dark:bg-green-950/20",
      functionCall.status === "error" && "border-l-red-500 bg-red-50/50 dark:bg-red-950/20"
    )}>
      <div className="flex items-center gap-2 mb-2">
        <Wrench className="h-4 w-4 text-muted-foreground" />
        <span className="font-semibold text-sm">{functionCall.toolName}</span>
        <div className="flex items-center gap-1 ml-auto">
          {getStatusIcon()}
          <span className="text-xs text-muted-foreground">{getStatusText()}</span>
        </div>
      </div>

      {/* 입력 파라미터 */}
      <div className="mt-3">
        <button
          onClick={() => setIsInputExpanded(!isInputExpanded)}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
        >
          {isInputExpanded ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
          입력 파라미터
        </button>
        {isInputExpanded && (
          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
            {JSON.stringify(functionCall.input, null, 2)}
          </pre>
        )}
      </div>

      {/* 실행 결과 */}
      {functionCall.output && (
        <div className="mt-3">
          <button
            onClick={() => setIsOutputExpanded(!isOutputExpanded)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            {isOutputExpanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            실행 결과
          </button>
          {isOutputExpanded && (
            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
              {functionCall.output}
            </pre>
          )}
        </div>
      )}
    </Card>
  );
}

