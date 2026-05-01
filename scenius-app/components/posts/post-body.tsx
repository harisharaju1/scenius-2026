import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

export function PostBody({ body }: { body: string }) {
  return (
    <div className="space-y-3 text-neutral-800 dark:text-neutral-200">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="leading-relaxed">{children}</p>,
          h1: ({ children }) => <h1 className="text-2xl font-bold">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-bold">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-semibold">{children}</h3>,
          ul: ({ children }) => <ul className="list-disc pl-5 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1">{children}</ol>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-neutral-300 pl-4 italic text-neutral-600 dark:text-neutral-400">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-blue-600 underline underline-offset-2 hover:text-blue-800 dark:text-blue-400"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={alt ?? ''} className="max-w-full rounded-md" />
          ),
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-md bg-neutral-100 p-4 text-sm dark:bg-neutral-800">
              {children}
            </pre>
          ),
          code: ({ children, className }) => (
            <code
              className={cn(
                'font-mono text-sm',
                !className && 'rounded bg-neutral-100 px-1 py-0.5 dark:bg-neutral-800',
              )}
            >
              {children}
            </code>
          ),
          hr: () => <hr className="border-neutral-200 dark:border-neutral-700" />,
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  )
}
