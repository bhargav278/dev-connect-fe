import { getCloudinaryUrl } from '../utils/getCloudinaryUrl';

interface AvatarProps {
  name: string;
  avatar?: string | null;
  size?: 'sm' | 'md' | 'lg';
  /** Show green online indicator dot */
  online?: boolean;
}

const sizeMap = {
  sm: 'size-8 text-xs',
  md: 'size-9 text-sm',
  lg: 'size-20 text-2xl',
};

const dotSizeMap = {
  sm: 'size-2 border',
  md: 'size-2.5 border',
  lg: 'size-4 border-2',
};

export function Avatar({ name, avatar, size = 'md', online }: AvatarProps) {
  const url = getCloudinaryUrl(avatar);

  return (
    <div className="relative inline-flex shrink-0">
      <div className={`${sizeMap[size]} grid place-items-center overflow-hidden rounded-full bg-zinc-700 font-bold text-white ring-1 ring-white/10`}>
        {url ? (
          <img src={url} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span>{name.charAt(0).toUpperCase()}</span>
        )}
      </div>
      {online ? (
        <span
          className={`absolute bottom-0 right-0 rounded-full bg-emerald-500 ${dotSizeMap[size]} border-zinc-900`}
        />
      ) : null}
    </div>
  );
}
