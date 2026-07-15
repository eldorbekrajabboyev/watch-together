import { cn } from '../utils/classnames';
import type { MovieInfo, Participant } from '../types';

interface MovieMatcherProps {
  localMovieInfo: MovieInfo | null;
  remoteMovieInfo: MovieInfo | null;
  participants: Participant[];
}

function formatFilesize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function truncateHash(hash: string): string {
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
}

export default function MovieMatcher({
  localMovieInfo,
  remoteMovieInfo,
}: MovieMatcherProps) {
  if (!remoteMovieInfo && !localMovieInfo) {
    return (
      <div className="bg-dark-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center">
            <svg className="w-4 h-4 text-dark-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm text-dark-400">Waiting for host to select movie...</p>
        </div>
      </div>
    );
  }

  if (!remoteMovieInfo && localMovieInfo) {
    return (
      <div className="bg-dark-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm text-dark-300">Movie selected:</p>
            <p className="text-sm font-medium text-white truncate">{localMovieInfo.filename}</p>
          </div>
        </div>
      </div>
    );
  }

  if (localMovieInfo && remoteMovieInfo) {
    const filenameMatch = localMovieInfo.filename === remoteMovieInfo.filename;
    const filesizeMatch = localMovieInfo.filesize === remoteMovieInfo.filesize;
    const durationMatch = localMovieInfo.duration === remoteMovieInfo.duration;
    const hashMatch = localMovieInfo.hash === remoteMovieInfo.hash;
    const allMatch = filenameMatch && filesizeMatch && durationMatch && hashMatch;

    const fields = [
      { name: 'Filename', local: localMovieInfo.filename, remote: remoteMovieInfo.filename, match: filenameMatch },
      { name: 'Filesize', local: formatFilesize(localMovieInfo.filesize), remote: formatFilesize(remoteMovieInfo.filesize), match: filesizeMatch },
      { name: 'Duration', local: formatDuration(localMovieInfo.duration), remote: formatDuration(remoteMovieInfo.duration), match: durationMatch },
      { name: 'Hash', local: truncateHash(localMovieInfo.hash), remote: truncateHash(remoteMovieInfo.hash), match: hashMatch },
    ];

    return (
      <div className="bg-dark-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-3">
          {allMatch ? (
            <>
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-green-400">Movie Matched</p>
            </>
          ) : (
            <>
              <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-red-400">Movie Mismatch</p>
            </>
          )}
        </div>

        {!allMatch && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {!filenameMatch && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
                Filename differs
              </span>
            )}
            {!filesizeMatch && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
                Filesize differs
              </span>
            )}
            {!durationMatch && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
                Duration differs
              </span>
            )}
            {!hashMatch && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
                Hash differs
              </span>
            )}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-dark-500 border-b border-dark-700">
                <th className="text-left py-1.5 pr-2 font-medium">Field</th>
                <th className="text-left py-1.5 pr-2 font-medium">Local</th>
                <th className="text-left py-1.5 pr-2 font-medium">Remote</th>
                <th className="text-center py-1.5 font-medium w-8"></th>
              </tr>
            </thead>
            <tbody>
              {fields.map((f) => (
                <tr key={f.name} className="border-b border-dark-800/50">
                  <td className="py-1.5 pr-2 text-dark-400">{f.name}</td>
                  <td className="py-1.5 pr-2 text-dark-200 max-w-[120px] truncate" title={f.local}>
                    {f.local}
                  </td>
                  <td className="py-1.5 pr-2 text-dark-200 max-w-[120px] truncate" title={f.remote}>
                    {f.remote}
                  </td>
                  <td className="py-1.5 text-center">
                    {f.match ? (
                      <span className="text-green-400">✓</span>
                    ) : (
                      <span className="text-red-400">✗</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return null;
}
