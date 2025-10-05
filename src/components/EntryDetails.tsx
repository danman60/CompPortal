'use client';

import { trpc } from '@/lib/trpc';

interface EntryDetailsProps {
  entryId: string;
}

export default function EntryDetails({ entryId }: EntryDetailsProps) {
  const { data: entry, isLoading, error } = trpc.entry.getById.useQuery({ id: entryId });

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 animate-pulse">
            <div className="h-6 bg-white/20 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-white/20 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-white/20 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-6">
        <h3 className="text-red-300 font-semibold mb-2">Error Loading Entry</h3>
        <p className="text-red-200">{error?.message || 'Entry not found'}</p>
      </div>
    );
  }

  const statusColors = {
    draft: 'bg-gray-500/20 text-gray-300 border-gray-400/30',
    registered: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
    confirmed: 'bg-green-500/20 text-green-300 border-green-400/30',
    cancelled: 'bg-red-500/20 text-red-300 border-red-400/30',
    completed: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
  };

  return (
    <div className="space-y-6">
      {/* Routine Header */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">{entry.title}</h2>
            <p className="text-gray-300">
              {entry.competitions?.name} ({entry.competitions?.year})
            </p>
          </div>
          <span className={`px-4 py-2 rounded-lg border font-semibold uppercase ${statusColors[entry.status as keyof typeof statusColors]}`}>
            {entry.status}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/5 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Studio</div>
            <div className="text-white font-semibold">{entry.studios?.name}</div>
            <div className="text-gray-400 text-sm">{entry.studios?.city}, {entry.studios?.province}</div>
          </div>

          <div className="bg-white/5 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Category</div>
            <div className="text-white font-semibold">{entry.dance_categories?.name}</div>
            <div className="text-gray-400 text-sm">{entry.classifications?.name}</div>
          </div>

          <div className="bg-white/5 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Age Group</div>
            <div className="text-white font-semibold">{entry.age_groups?.name}</div>
          </div>

          <div className="bg-white/5 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Size</div>
            <div className="text-white font-semibold">{entry.entry_size_categories?.name}</div>
            <div className="text-gray-400 text-sm">{entry.entry_participants?.length || 0} Dancer(s)</div>
          </div>
        </div>
      </div>

      {/* Dancers */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
        <h3 className="text-2xl font-bold text-white mb-4">👥 Dancers</h3>
        {entry.entry_participants && entry.entry_participants.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {entry.entry_participants.map((participant) => (
              <div key={participant.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-white font-semibold text-lg">
                      {participant.dancers?.first_name} {participant.dancers?.last_name}
                    </h4>
                    {participant.role && (
                      <div className="text-gray-400 text-sm">Role: {participant.role}</div>
                    )}
                    {participant.costume_size && (
                      <div className="text-gray-400 text-sm">Costume: {participant.costume_size}</div>
                    )}
                  </div>
                  {participant.display_order !== null && (
                    <div className="bg-white/10 rounded-full w-8 h-8 flex items-center justify-center text-white font-semibold">
                      {participant.display_order + 1}
                    </div>
                  )}
                </div>
                {participant.special_needs && (
                  <div className="mt-2 pt-2 border-t border-white/10">
                    <div className="text-gray-400 text-xs">Special Needs:</div>
                    <div className="text-gray-300 text-sm">{participant.special_needs}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            No dancers assigned to this routine yet.
          </div>
        )}
      </div>

      {/* Music Information */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
        <h3 className="text-2xl font-bold text-white mb-4">🎵 Music Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/5 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Song Title</div>
            <div className="text-white font-semibold">{entry.music_title || 'Not specified'}</div>
          </div>

          <div className="bg-white/5 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Artist</div>
            <div className="text-white font-semibold">{entry.music_artist || 'Not specified'}</div>
          </div>

          <div className="bg-white/5 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Duration</div>
            <div className="text-white font-semibold">Not specified</div>
          </div>

          <div className="bg-white/5 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Music File</div>
            <div className="text-white font-semibold">
              {entry.music_file_url ? (
                <a
                  href={entry.music_file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pink-400 hover:text-pink-300 flex items-center gap-2"
                >
                  🎧 Download/Listen
                </a>
              ) : (
                <span className="text-yellow-400">⚠️ Not uploaded</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Performance Details */}
      {(entry.performance_date || entry.performance_time || entry.warm_up_time || entry.heat) && (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
          <h3 className="text-2xl font-bold text-white mb-4">📅 Performance Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {entry.performance_date && (
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">Performance Date</div>
                <div className="text-white font-semibold">
                  {new Date(entry.performance_date).toLocaleDateString()}
                </div>
              </div>
            )}

            {entry.performance_time && (
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">Performance Time</div>
                <div className="text-white font-semibold">{String(entry.performance_time)}</div>
              </div>
            )}

            {entry.warm_up_time && (
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">Warm-up Time</div>
                <div className="text-white font-semibold">{String(entry.warm_up_time)}</div>
              </div>
            )}

            {entry.heat && (
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">Heat</div>
                <div className="text-white font-semibold">{entry.heat}</div>
              </div>
            )}

            {entry.running_order !== null && (
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">Running Order</div>
                <div className="text-white font-semibold">#{entry.running_order}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Additional Information */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
        <h3 className="text-2xl font-bold text-white mb-4">📋 Additional Information</h3>
        <div className="space-y-4">
          {entry.choreographer && (
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Choreographer</div>
              <div className="text-white">{entry.choreographer}</div>
            </div>
          )}

          {entry.costume_description && (
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Costume Description</div>
              <div className="text-white">{entry.costume_description}</div>
            </div>
          )}

          {entry.props_required && (
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Props Required</div>
              <div className="text-white">{entry.props_required}</div>
            </div>
          )}

          {entry.special_requirements && (
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Special Requirements</div>
              <div className="text-white">{entry.special_requirements}</div>
            </div>
          )}

          {entry.accessibility_needs && (
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Accessibility Needs</div>
              <div className="text-white">{entry.accessibility_needs}</div>
            </div>
          )}
        </div>
      </div>

      {/* Special Features */}
      {(entry.is_title_upgrade || entry.is_title_interview || entry.is_improvisation || entry.is_glow_off_round || entry.is_overall_competition) && (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
          <h3 className="text-2xl font-bold text-white mb-4">⭐ Special Features</h3>
          <div className="flex flex-wrap gap-3">
            {entry.is_title_upgrade && (
              <span className="px-4 py-2 bg-yellow-500/20 text-yellow-300 border border-yellow-400/30 rounded-lg font-semibold">
                🏆 Title Upgrade
              </span>
            )}
            {entry.is_title_interview && (
              <span className="px-4 py-2 bg-purple-500/20 text-purple-300 border border-purple-400/30 rounded-lg font-semibold">
                🎤 Title Interview
              </span>
            )}
            {entry.is_improvisation && (
              <span className="px-4 py-2 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-lg font-semibold">
                🎭 Improvisation
              </span>
            )}
            {entry.is_glow_off_round && (
              <span className="px-4 py-2 bg-pink-500/20 text-pink-300 border border-pink-400/30 rounded-lg font-semibold">
                ✨ GLOW Off Round
              </span>
            )}
            {entry.is_overall_competition && (
              <span className="px-4 py-2 bg-green-500/20 text-green-300 border border-green-400/30 rounded-lg font-semibold">
                🌟 Overall Competition
              </span>
            )}
          </div>
        </div>
      )}

      {/* Fees */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
        <h3 className="text-2xl font-bold text-white mb-4">💰 Routine Fees</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Routine Fee</div>
            <div className="text-white font-semibold text-2xl">
              ${Number(entry.entry_fee || 0).toFixed(2)}
            </div>
          </div>

          <div className="bg-white/5 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Late Fee</div>
            <div className="text-white font-semibold text-2xl">
              ${Number(entry.late_fee || 0).toFixed(2)}
            </div>
          </div>

          <div className="bg-green-500/20 border border-green-400/30 rounded-lg p-4">
            <div className="text-green-300 text-sm mb-1">Total Fee</div>
            <div className="text-green-200 font-bold text-2xl">
              ${Number(entry.total_fee || 0).toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
