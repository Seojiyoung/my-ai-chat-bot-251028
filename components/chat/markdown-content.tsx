"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./code-block";
import { ExternalLink } from "lucide-react";
import type { Components } from "react-markdown";

interface MarkdownContentProps {
  content: string;
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  const components: Components = {
    // 코드 블록
    code(props) {
      const { node, inline, className, children, ...rest } = props as {
        node?: unknown;
        inline?: boolean;
        className?: string;
        children?: React.ReactNode;
      };
      const match = /language-(\w+)/.exec(className || "");
      const language = match ? match[1] : undefined;
      const value = String(children).replace(/\n$/, "");

      return (
        <CodeBlock
          language={language}
          value={value}
          inline={inline}
          {...rest}
        />
      );
    },

    // 링크 - 새 탭에서 열기
    a({ node, children, href, ...props }) {
      const isExternal = href?.startsWith("http");
      return (
        <a
          href={href}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
          className="text-blue-500 hover:text-blue-600 underline inline-flex items-center gap-1"
          {...props}
        >
          {children}
          {isExternal && <ExternalLink className="h-3 w-3" />}
        </a>
      );
    },

    // 제목들
    h1({ node, children, ...props }) {
      return (
        <h1 className="text-2xl font-bold mt-6 mb-4 first:mt-0" {...props}>
          {children}
        </h1>
      );
    },
    h2({ node, children, ...props }) {
      return (
        <h2 className="text-xl font-bold mt-5 mb-3 first:mt-0" {...props}>
          {children}
        </h2>
      );
    },
    h3({ node, children, ...props }) {
      return (
        <h3 className="text-lg font-semibold mt-4 mb-2 first:mt-0" {...props}>
          {children}
        </h3>
      );
    },
    h4({ node, children, ...props }) {
      return (
        <h4 className="text-base font-semibold mt-3 mb-2 first:mt-0" {...props}>
          {children}
        </h4>
      );
    },

    // 리스트
    ul({ node, children, ...props }) {
      return (
        <ul className="list-disc list-inside my-3 space-y-1" {...props}>
          {children}
        </ul>
      );
    },
    ol({ node, children, ...props }) {
      return (
        <ol className="list-decimal list-inside my-3 space-y-1" {...props}>
          {children}
        </ol>
      );
    },
    li({ node, children, ...props }) {
      return (
        <li className="ml-4" {...props}>
          {children}
        </li>
      );
    },

    // 단락
    p({ node, children, ...props }) {
      return (
        <p className="my-3 leading-7 first:mt-0 last:mb-0" {...props}>
          {children}
        </p>
      );
    },

    // 인용구
    blockquote({ node, children, ...props }) {
      return (
        <blockquote
          className="border-l-4 border-muted-foreground/30 pl-4 my-4 italic text-muted-foreground"
          {...props}
        >
          {children}
        </blockquote>
      );
    },

    // 테이블
    table({ node, children, ...props }) {
      return (
        <div className="my-4 overflow-x-auto">
          <table
            className="min-w-full border-collapse border border-border"
            {...props}
          >
            {children}
          </table>
        </div>
      );
    },
    thead({ node, children, ...props }) {
      return (
        <thead className="bg-muted" {...props}>
          {children}
        </thead>
      );
    },
    tbody({ node, children, ...props }) {
      return <tbody {...props}>{children}</tbody>;
    },
    tr({ node, children, ...props }) {
      return (
        <tr className="border-b border-border" {...props}>
          {children}
        </tr>
      );
    },
    th({ node, children, ...props }) {
      return (
        <th
          className="px-4 py-2 text-left font-semibold border border-border"
          {...props}
        >
          {children}
        </th>
      );
    },
    td({ node, children, ...props }) {
      return (
        <td className="px-4 py-2 border border-border" {...props}>
          {children}
        </td>
      );
    },

    // 구분선
    hr({ node, ...props }) {
      return <hr className="my-6 border-t border-border" {...props} />;
    },

    // Strong, Em
    strong({ node, children, ...props }) {
      return (
        <strong className="font-bold" {...props}>
          {children}
        </strong>
      );
    },
    em({ node, children, ...props }) {
      return (
        <em className="italic" {...props}>
          {children}
        </em>
      );
    },
  };

  return (
    <div className="markdown-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

