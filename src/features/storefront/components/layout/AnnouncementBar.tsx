import { useMemo } from "react";
import { Link } from "react-router-dom";

interface Announcement {
  id: string;
  text: string;
  link: string | null;
}

interface AnnouncementBarProps {
  announcements: Announcement[];
  bgColor: string;
  textColor: string;
  speed?: number; // 1-160 scale: 1 = slowest (20s), 160 = fastest (2.5s)
}

export const AnnouncementBar = ({
  announcements,
  bgColor,
  textColor,
  speed = 80,
}: AnnouncementBarProps) => {
  // Don't render if no announcements
  if (!announcements || announcements.length === 0) {
    return null;
  }

  // Single announcement = static text
  const isSingleAnnouncement = announcements.length === 1;

  // Calculate animation duration: speed 1 = 20s, speed 160 = 2.5s (8x faster than 20s)
  const animationDuration = useMemo(() => {
    // Linear interpolation: speed 1 -> 20s, speed 160 -> 2.5s
    const minDuration = 2.5; // fastest (8x faster than 20s)
    const maxDuration = 20; // slowest
    const normalizedSpeed = Math.max(1, Math.min(160, speed || 80));
    return maxDuration - ((normalizedSpeed - 1) / 159) * (maxDuration - minDuration);
  }, [speed]);

  const renderAnnouncementText = (announcement: Announcement, index: number) => {
    const spacingClass = isSingleAnnouncement ? "" : "mx-4 md:mx-16";
    
    if (announcement.link) {
      return (
        <Link
          key={`${announcement.id}-${index}`}
          to={announcement.link}
          className={`inline-block whitespace-nowrap hover:underline ${spacingClass}`}
        >
          {announcement.text}
        </Link>
      );
    }

    return (
      <span key={`${announcement.id}-${index}`} className={`inline-block whitespace-nowrap ${spacingClass}`}>
        {announcement.text}
      </span>
    );
  };

  // Single announcement: static centered text
  if (isSingleAnnouncement) {
    return (
      <div
        className="w-full py-2 text-xs font-medium text-center"
        style={{ backgroundColor: bgColor, color: textColor }}
      >
        {renderAnnouncementText(announcements[0], 0)}
      </div>
    );
  }

  // Multiple announcements: marquee animation
  return (
    <div
      className="w-full overflow-hidden py-2 text-xs font-medium"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <div className="relative flex">
        {/* First marquee */}
        <div
          className="animate-marquee flex shrink-0"
          style={{
            animationDuration: `${animationDuration}s`,
          }}
        >
          {announcements.map((announcement, index) =>
            renderAnnouncementText(announcement, index)
          )}
        </div>
        
        {/* Duplicate for seamless loop */}
        <div
          className="animate-marquee flex shrink-0"
          style={{
            animationDuration: `${animationDuration}s`,
          }}
        >
          {announcements.map((announcement, index) =>
            renderAnnouncementText(announcement, index + announcements.length)
          )}
        </div>
      </div>
    </div>
  );
};
