export const timeAgo = (isoDateString: string): string => {
  const date = new Date(isoDateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) {
    return Math.floor(interval) + "y ago";
  }
  interval = seconds / 2592000;
  if (interval > 1) {
    return Math.floor(interval) + "mo ago";
  }
  interval = seconds / 86400;
  if (interval > 1) {
    return Math.floor(interval) + "d ago";
  }
  interval = seconds / 3600;
  if (interval > 1) {
    return Math.floor(interval) + "h ago";
  }
  interval = seconds / 60;
  if (interval > 1) {
    return Math.floor(interval) + "m ago";
  }
  return Math.floor(seconds) + "s ago";
};

export const formatDueDate = (isoDateString: string): string => {
    const dueDate = new Date(isoDateString);
    const now = new Date();
    
    // Reset time part to compare dates only
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const due = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return `Overdue by ${Math.abs(diffDays)} day(s)`;
    }
    if (diffDays === 0) {
        return "Due today";
    }
    if (diffDays === 1) {
        return "Due tomorrow";
    }
    if (diffDays <= 7) {
        return `Due in ${diffDays} days`;
    }
    return `Due on ${due.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
};