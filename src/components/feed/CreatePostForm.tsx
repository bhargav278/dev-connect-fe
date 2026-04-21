import { useMutation, useQueryClient } from '@tanstack/react-query';
import { IconCode, IconPhoto, IconPlus } from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import * as yup from 'yup';
import { toast } from 'sonner';
import { useState } from 'react';
import { postsApi } from '../../features/posts/posts.api';
import { yupValidate } from '../../utils/yupValidate';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';

const createPostSchema = yup.object({
  content: yup.string().trim().min(1, 'Post content cannot be empty').max(5000, 'Max 5000 characters').required(),
  codeSnippet: yup.string().max(10000, 'Max 10000 characters').optional(),
  language: yup.string().max(50, 'Max 50 characters').optional(),
  tags: yup.string().max(300, 'Max 300 characters').optional(),
});

interface CreatePostFormProps {
  onSuccess?: () => void;
}

export function CreatePostForm({ onSuccess }: CreatePostFormProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const qc = useQueryClient();

  const createForm = useForm({
    initialValues: { content: '', codeSnippet: '', language: '', tags: '' },
    validate: yupValidate(createPostSchema),
  });

  const createPostMutation = useMutation({
    mutationFn: async (values: typeof createForm.values) => {
      const tags = values.tags
        ? values.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
            .slice(0, 10)
        : [];

      return postsApi.createPost({
        content: values.content.trim(),
        codeSnippet: values.codeSnippet.trim() || undefined,
        language: values.language.trim() || undefined,
        tags,
        image: selectedImage,
      });
    },
    onSuccess: () => {
      toast.success('Posted');
      setSelectedImage(null);
      createForm.reset();
      qc.invalidateQueries({ queryKey: ['feed'] });
      qc.invalidateQueries({ queryKey: ['myPosts'] });
      qc.invalidateQueries({ queryKey: ['userPosts'] });
      onSuccess?.();
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <form
        className="space-y-4"
        onSubmit={createForm.onSubmit((values) => createPostMutation.mutate(values))}
      >
        <div className="grid gap-2">
          <textarea
            rows={3}
            placeholder="What's happening?"
            className="w-full resize-none rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 ring-1 ring-transparent focus:ring-indigo-500/40"
            {...createForm.getInputProps('content')}
          />
          {createForm.errors.content && <p className="text-xs text-rose-300">{createForm.errors.content}</p>}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-xs font-medium text-zinc-300">Tags (comma separated)</span>
            <input
              placeholder="react, node, postgres"
              className="w-full rounded-xl border border-white/10 bg-zinc-950/30 px-3 py-2 text-sm outline-none placeholder:text-zinc-500 ring-1 ring-transparent focus:ring-indigo-500/40"
              {...createForm.getInputProps('tags')}
            />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-medium text-zinc-300">Language (optional)</span>
            <input
              placeholder="typescript"
              className="w-full rounded-xl border border-white/10 bg-zinc-950/30 px-3 py-2 text-sm outline-none placeholder:text-zinc-500 ring-1 ring-transparent focus:ring-indigo-500/40"
              {...createForm.getInputProps('language')}
            />
          </label>
        </div>

        <label className="grid gap-2">
          <span className="text-xs font-medium text-zinc-300 inline-flex items-center gap-2">
            <IconCode className="size-4" /> Code snippet (optional)
          </span>
          <textarea
            rows={4}
            placeholder="Paste code here..."
            className="w-full resize-none rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3 font-mono text-xs text-zinc-100 outline-none placeholder:text-zinc-500 ring-1 ring-transparent focus:ring-indigo-500/40"
            {...createForm.getInputProps('codeSnippet')}
          />
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-200 hover:bg-white/5">
              <IconPhoto className="size-5 text-zinc-300" />
              <span>{selectedImage ? 'Change image' : 'Add image'}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setSelectedImage(e.target.files?.[0] ?? null)}
              />
            </label>
            {selectedImage ? <span className="text-xs text-zinc-400">{selectedImage.name}</span> : null}
          </div>

          <button
            type="submit"
            disabled={createPostMutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-500/20 hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <IconPlus className="size-5" />
            {createPostMutation.isPending ? 'Posting…' : 'Post'}
          </button>
        </div>
      </form>
    </div>
  );
}
