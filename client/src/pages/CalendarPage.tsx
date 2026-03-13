import { useState, useRef } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  isSameMonth,
  isToday,
  parseISO,
} from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarDays, LayoutGrid, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCalendar, CalendarPost } from '../hooks/useCalendar';
import { useAccounts } from '../hooks/useAccounts';
import { POST_STATUS_CONFIG, POST_TYPE_LABELS, ROUTES } from '../lib/constants';
import { cn } from '../lib/utils';
import { extractErrorMessage } from '../lib/errorUtils';
import { Link } from 'react-router-dom';

type ViewMode = 'month' | 'week';

const STATUS_PILL_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-200 text-gray-700',
  SCHEDULED: 'bg-blue-100 text-blue-700',
  PUBLISHING: 'bg-yellow-100 text-yellow-700',
  PUBLISHED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
};

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ---- Post Detail Popover ----

interface PostDetailPopoverProps {
  post: CalendarPost;
  onClose: () => void;
}

function PostDetailPopover({ post, onClose }: PostDetailPopoverProps) {
  const statusConfig = POST_STATUS_CONFIG[post.status];
  const typeLabel = POST_TYPE_LABELS[post.type] ?? post.type;
  const dateLabel = post.publishedAt
    ? `Published ${format(parseISO(post.publishedAt), 'MMM d, yyyy h:mm a')}`
    : post.scheduledAt
      ? `Scheduled ${format(parseISO(post.scheduledAt), 'MMM d, yyyy h:mm a')}`
      : 'No date';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="relative bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
              statusConfig?.bg ?? 'bg-gray-100',
              statusConfig?.color ?? 'text-gray-700',
            )}
          >
            {statusConfig?.label ?? post.status}
          </span>
          <span className="text-xs text-gray-500">{typeLabel}</span>
        </div>

        <p className="text-sm font-medium text-gray-500 mb-1">@{post.igUsername}</p>

        {post.captionPreview ? (
          <p className="text-sm text-gray-800 mb-3 leading-relaxed">{post.captionPreview}</p>
        ) : (
          <p className="text-sm text-gray-400 italic mb-3">No caption</p>
        )}

        <p className="text-xs text-gray-400">{dateLabel}</p>

        {post.engagement && post.status === 'PUBLISHED' && (
          <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-sm font-semibold text-gray-900">{post.engagement.likeCount}</p>
              <p className="text-xs text-gray-500">Likes</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{post.engagement.commentCount}</p>
              <p className="text-xs text-gray-500">Comments</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {(post.engagement.engagementRate * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">Engagement</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Draggable Post Pill ----

interface PostPillProps {
  post: CalendarPost;
  compact?: boolean;
  onDragStart: (postId: string) => void;
  onClick: (post: CalendarPost) => void;
}

function PostPill({ post, compact = false, onDragStart, onClick }: PostPillProps) {
  const isDraggable = post.status === 'SCHEDULED' || post.status === 'DRAFT';
  const pillColor = STATUS_PILL_COLORS[post.status] ?? 'bg-gray-200 text-gray-700';

  return (
    <div
      draggable={isDraggable}
      onDragStart={isDraggable ? () => onDragStart(post.id) : undefined}
      onClick={() => onClick(post)}
      className={cn(
        'rounded px-1.5 py-0.5 text-xs truncate cursor-pointer select-none transition-opacity',
        pillColor,
        isDraggable ? 'cursor-grab active:cursor-grabbing hover:opacity-80' : 'cursor-pointer',
        compact ? 'max-w-full' : 'max-w-full',
      )}
      title={post.captionPreview ?? `@${post.igUsername} — ${post.type}`}
    >
      {compact ? (
        <span>@{post.igUsername}</span>
      ) : (
        <span>
          <span className="font-medium">@{post.igUsername}</span>
          {post.captionPreview && (
            <span className="text-[10px] opacity-80 ml-1">{post.captionPreview}</span>
          )}
        </span>
      )}
    </div>
  );
}

// ---- Month Grid Cell ----

interface MonthCellProps {
  date: Date;
  posts: CalendarPost[];
  isCurrentMonth: boolean;
  onDragStart: (postId: string) => void;
  onDrop: (date: Date) => void;
  onClick: (post: CalendarPost) => void;
}

function MonthCell({ date, posts, isCurrentMonth, onDragStart, onDrop, onClick }: MonthCellProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      className={cn(
        'min-h-[90px] border border-gray-100 p-1 rounded-lg transition-colors',
        isCurrentMonth ? 'bg-white' : 'bg-gray-50',
        isDragOver && 'bg-indigo-50 border-indigo-300',
      )}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={() => { setIsDragOver(false); onDrop(date); }}
    >
      <p
        className={cn(
          'text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full',
          isCurrentMonth ? 'text-gray-700' : 'text-gray-400',
          isToday(date) && 'bg-indigo-600 text-white',
        )}
      >
        {format(date, 'd')}
      </p>
      <div className="space-y-0.5">
        {posts.slice(0, 3).map((post) => (
          <PostPill
            key={post.id}
            post={post}
            compact
            onDragStart={onDragStart}
            onClick={onClick}
          />
        ))}
        {posts.length > 3 && (
          <p className="text-[10px] text-gray-400 pl-1">+{posts.length - 3} more</p>
        )}
      </div>
    </div>
  );
}

// ---- Week Day Cell ----

interface WeekDayCellProps {
  date: Date;
  posts: CalendarPost[];
  onDragStart: (postId: string) => void;
  onDrop: (date: Date) => void;
  onClick: (post: CalendarPost) => void;
}

function WeekDayCell({ date, posts, onDragStart, onDrop, onClick }: WeekDayCellProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      className={cn(
        'flex flex-col min-h-[160px] rounded-lg border p-2 transition-colors',
        isToday(date) ? 'border-indigo-300 bg-indigo-50' : 'border-gray-100 bg-white',
        isDragOver && 'bg-indigo-50 border-indigo-300',
      )}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={() => { setIsDragOver(false); onDrop(date); }}
    >
      <div className="mb-2">
        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
          {format(date, 'EEE')}
        </p>
        <p
          className={cn(
            'text-sm font-semibold',
            isToday(date) ? 'text-indigo-600' : 'text-gray-800',
          )}
        >
          {format(date, 'd')}
        </p>
      </div>
      <div className="flex-1 space-y-1">
        {posts.map((post) => (
          <PostPill
            key={post.id}
            post={post}
            compact={false}
            onDragStart={onDragStart}
            onClick={onClick}
          />
        ))}
      </div>
    </div>
  );
}

// ---- Week View ----

interface WeekViewProps {
  weekStart: Date;
  byDate: Record<string, CalendarPost[]>;
  onDragStart: (postId: string) => void;
  onDrop: (date: Date) => void;
  onClick: (post: CalendarPost) => void;
}

function WeekView({ weekStart, byDate, onDragStart, onDrop, onClick }: WeekViewProps) {
  return (
    <div className="grid grid-cols-7 gap-2">
      {WEEK_DAYS.map((_, i) => {
        const date = addDays(weekStart, i);
        const dateKey = format(date, 'yyyy-MM-dd');
        const posts = byDate[dateKey] ?? [];

        return (
          <WeekDayCell
            key={dateKey}
            date={date}
            posts={posts}
            onDragStart={onDragStart}
            onDrop={onDrop}
            onClick={onClick}
          />
        );
      })}
    </div>
  );
}

// ---- Unscheduled Drafts Sidebar ----

interface UnscheduledDraftsSidebarProps {
  drafts: CalendarPost[];
  onDragStart: (postId: string) => void;
  onClick: (post: CalendarPost) => void;
}

function UnscheduledDraftsSidebar({ drafts, onDragStart, onClick }: UnscheduledDraftsSidebarProps) {
  return (
    <aside className="w-56 shrink-0">
      <div className="bg-white rounded-xl border border-gray-100 p-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Unscheduled Drafts
        </h3>
        {drafts.length === 0 ? (
          <p className="text-xs text-gray-400">No unscheduled drafts</p>
        ) : (
          <div className="space-y-1.5">
            {drafts.map((post) => (
              <div
                key={post.id}
                draggable
                onDragStart={() => onDragStart(post.id)}
                onClick={() => onClick(post)}
                className="rounded-lg border border-gray-200 p-2 cursor-grab active:cursor-grabbing hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
              >
                <p className="text-xs font-medium text-gray-700 truncate">@{post.igUsername}</p>
                {post.captionPreview && (
                  <p className="text-[11px] text-gray-400 truncate mt-0.5">{post.captionPreview}</p>
                )}
                <span className="inline-block mt-1 text-[10px] bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">
                  {POST_TYPE_LABELS[post.type] ?? post.type}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

// ---- Main Calendar Page ----

export default function CalendarPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [accountFilter, setAccountFilter] = useState('');
  const [selectedPost, setSelectedPost] = useState<CalendarPost | null>(null);
  const dragPostIdRef = useRef<string | null>(null);

  const { data, loading, error, reschedule } = useCalendar({
    month: currentDate,
    igAccountId: accountFilter || undefined,
  });
  const { accounts } = useAccounts();

  const { byDate, unscheduledDrafts } = data;

  // ---- Navigation ----

  const goToPrev = () => {
    if (viewMode === 'month') setCurrentDate((d) => subMonths(d, 1));
    else setCurrentDate((d) => subWeeks(d, 1));
  };

  const goToNext = () => {
    if (viewMode === 'month') setCurrentDate((d) => addMonths(d, 1));
    else setCurrentDate((d) => addWeeks(d, 1));
  };

  const goToToday = () => setCurrentDate(new Date());

  // ---- Drag and drop ----

  const handleDragStart = (postId: string) => {
    dragPostIdRef.current = postId;
  };

  const handleDrop = async (date: Date) => {
    const postId = dragPostIdRef.current;
    dragPostIdRef.current = null;
    if (!postId) return;

    // Preserve existing time if available, otherwise set to noon
    const allPosts = [
      ...Object.values(byDate).flat(),
      ...unscheduledDrafts,
    ];
    const post = allPosts.find((p) => p.id === postId);
    const existingTime = post?.scheduledAt ? parseISO(post.scheduledAt) : null;
    const newDate = new Date(date);
    if (existingTime) {
      newDate.setHours(existingTime.getHours(), existingTime.getMinutes(), 0, 0);
    } else {
      newDate.setHours(12, 0, 0, 0);
    }

    try {
      await reschedule(postId, newDate);
      toast.success('Post rescheduled');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to reschedule post'));
    }
  };

  // ---- Month grid construction ----

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);

  const monthDays: Date[] = [];
  let day = gridStart;
  while (day <= gridEnd) {
    monthDays.push(day);
    day = addDays(day, 1);
  }

  // ---- Week grid construction ----

  const weekStart = startOfWeek(currentDate);

  // ---- Total post count for empty state ----

  const totalPostsInView = Object.values(byDate).reduce((sum, posts) => sum + posts.length, 0);
  const hasAnyPosts = totalPostsInView > 0 || unscheduledDrafts.length > 0;

  // ---- Title ----

  const title =
    viewMode === 'month'
      ? format(currentDate, 'MMMM yyyy')
      : `Week of ${format(weekStart, 'MMM d')} – ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`;

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Calendar</h1>
          <p className="text-sm text-gray-500 mt-1">
            Plan and manage your Instagram content schedule
          </p>
        </div>
        <Link
          to={ROUTES.POSTS}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Post
        </Link>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Month/week navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={goToPrev}
            className="rounded-lg border border-gray-300 bg-white p-2 text-gray-500 hover:bg-gray-50 transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={goToToday}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Today
          </button>
          <button
            onClick={goToNext}
            className="rounded-lg border border-gray-300 bg-white p-2 text-gray-500 hover:bg-gray-50 transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <h2 className="text-base font-semibold text-gray-800 min-w-[180px]">{title}</h2>

        {/* View toggle */}
        <div className="flex rounded-lg border border-gray-300 bg-white overflow-hidden ml-auto">
          <button
            onClick={() => setViewMode('month')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors',
              viewMode === 'month'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 hover:bg-gray-50',
            )}
          >
            <LayoutGrid className="h-4 w-4" />
            Month
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors',
              viewMode === 'week'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 hover:bg-gray-50',
            )}
          >
            <CalendarDays className="h-4 w-4" />
            Week
          </button>
        </div>

        {/* Account filter */}
        <select
          value={accountFilter}
          onChange={(e) => setAccountFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Accounts</option>
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              @{acc.igUsername}
            </option>
          ))}
        </select>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="flex items-center justify-center h-48">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && !hasAnyPosts && (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <CalendarDays className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-lg font-medium text-gray-600">No posts this month</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">
            Start scheduling content to see it on the calendar.
          </p>
          <Link
            to={ROUTES.POSTS}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create a post
          </Link>
        </div>
      )}

      {/* Calendar + sidebar */}
      {!loading && !error && hasAnyPosts && (
        <div className="flex gap-4 flex-1">
          {/* Calendar grid */}
          <div className="flex-1 min-w-0">
            {viewMode === 'month' ? (
              <>
                {/* Day-of-week header */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {WEEK_DAYS.map((d) => (
                    <div key={d} className="text-center text-xs font-medium text-gray-500 py-1">
                      {d}
                    </div>
                  ))}
                </div>
                {/* Grid cells */}
                <div className="grid grid-cols-7 gap-1">
                  {monthDays.map((date) => {
                    const dateKey = format(date, 'yyyy-MM-dd');
                    const posts = byDate[dateKey] ?? [];
                    return (
                      <MonthCell
                        key={dateKey}
                        date={date}
                        posts={posts}
                        isCurrentMonth={isSameMonth(date, currentDate)}
                        onDragStart={handleDragStart}
                        onDrop={handleDrop}
                        onClick={setSelectedPost}
                      />
                    );
                  })}
                </div>
              </>
            ) : (
              <WeekView
                weekStart={weekStart}
                byDate={byDate}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
                onClick={setSelectedPost}
              />
            )}
          </div>

          {/* Unscheduled drafts sidebar */}
          <UnscheduledDraftsSidebar
            drafts={unscheduledDrafts}
            onDragStart={handleDragStart}
            onClick={setSelectedPost}
          />
        </div>
      )}

      {/* Post detail popover */}
      {selectedPost && (
        <PostDetailPopover
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
        />
      )}
    </div>
  );
}
