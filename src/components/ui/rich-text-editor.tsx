import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Button } from './button';
import { Toggle } from './toggle';
import { Separator } from './separator';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  ImageIcon,
  Table as TableIcon,
  Undo,
  Redo,
  Code,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const RichTextEditor = ({ value, onChange, placeholder, className }: RichTextEditorProps) => {
  const [showCodeView, setShowCodeView] = useState(false);
  const isSyncingFromOutsideRef = useRef(false);

  const normalizeHtml = (html: string) => {
    const trimmed = html.trim();
    return trimmed === '<p></p>' ? '' : trimmed;
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      Image,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      if (isSyncingFromOutsideRef.current) {
        isSyncingFromOutsideRef.current = false;
        return;
      }

      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4 prose-headings:font-semibold prose-h3:text-lg prose-h3:mt-4 prose-h3:mb-2 prose-strong:font-semibold prose-ul:my-2 prose-ul:list-disc prose-ul:pl-5 prose-ol:list-decimal prose-ol:pl-5 prose-li:my-1',
      },
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const nextValue = normalizeHtml(value || '');
    const currentValue = normalizeHtml(editor.getHTML());

    if (nextValue === currentValue) {
      return;
    }

    isSyncingFromOutsideRef.current = true;
    editor.commands.setContent(value || '');
  }, [editor, value]);

  if (!editor) {
    return null;
  }

  const addImage = () => {
    const url = window.prompt('URL da imagem:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const addLink = () => {
    const url = window.prompt('URL do link:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  return (
    <div className={cn('border rounded-md', className)}>
      {/* Toolbar */}
      <div className="border-b bg-muted/50 p-2 flex flex-wrap gap-1 items-center">
        {/* Undo/Redo */}
        <Toggle
          size="sm"
          pressed={false}
          onPressedChange={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={false}
          onPressedChange={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Redo className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Formatação de texto */}
        <Toggle
          size="sm"
          pressed={editor.isActive('bold')}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4 font-bold" strokeWidth={3} />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('italic')}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('underline')}
          onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Listas */}
        <Toggle
          size="sm"
          pressed={editor.isActive('bulletList')}
          onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('orderedList')}
          onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Alinhamento */}
        <Toggle
          size="sm"
          pressed={editor.isActive({ textAlign: 'left' })}
          onPressedChange={() => editor.chain().focus().setTextAlign('left').run()}
        >
          <AlignLeft className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive({ textAlign: 'center' })}
          onPressedChange={() => editor.chain().focus().setTextAlign('center').run()}
        >
          <AlignCenter className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive({ textAlign: 'right' })}
          onPressedChange={() => editor.chain().focus().setTextAlign('right').run()}
        >
          <AlignRight className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Link, Imagem, Tabela */}
        <Toggle size="sm" pressed={false} onPressedChange={addLink}>
          <LinkIcon className="h-4 w-4" />
        </Toggle>
        <Toggle size="sm" pressed={false} onPressedChange={addImage}>
          <ImageIcon className="h-4 w-4" />
        </Toggle>
        <Toggle size="sm" pressed={false} onPressedChange={addTable}>
          <TableIcon className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Visual/Código */}
        <div className="ml-auto flex gap-1">
          <Button
            type="button"
            size="sm"
            variant={!showCodeView ? 'default' : 'ghost'}
            onClick={() => setShowCodeView(false)}
          >
            Visual
          </Button>
          <Button
            type="button"
            size="sm"
            variant={showCodeView ? 'default' : 'ghost'}
            onClick={() => setShowCodeView(true)}
          >
            <Code className="h-4 w-4 mr-1" />
            Código
          </Button>
        </div>
      </div>

      {/* Editor */}
      {!showCodeView ? (
        <EditorContent editor={editor} />
      ) : (
        <textarea
          className="w-full min-h-[200px] p-4 font-mono text-sm focus:outline-none"
          value={editor.getHTML()}
          onChange={(e) => {
            editor.commands.setContent(e.target.value);
            onChange(e.target.value);
          }}
        />
      )}
    </div>
  );
};
