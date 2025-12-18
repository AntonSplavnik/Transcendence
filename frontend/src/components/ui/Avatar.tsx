import React from "react";

interface AvatarProps {
	src?: string | null;            // Avatar URL (null if no avatar)
	nickname: string;               // Nickname to generate initials
	size?: "sm" | "md" | "lg";      // Avatar size
	className?: string;             // Additional CSS classes
}

/**
 * Reusable Avatar component
 * 
 * Displays the avatar image if available, otherwise displays the nickname
 * initials in a circle with an automatically generated unique color.
 * 
 */
export default function Avatar({ src, nickname, size = "md", className = "" }: AvatarProps) {
	// 1. Determine pixel size according to the prop
	const sizeClasses = {
		sm: "w-8 h-8 text-xs",      // 32px
		md: "w-16 h-16 text-xl",    // 64px
		lg: "w-32 h-32 text-4xl",   // 128px
	};

	// 2. Generate initials from nickname
	// Example: "JohnDoe" → "JD", "alice" → "A"
	const getInitials = (name: string): string => {
		const cleaned = name.trim();
		if (cleaned.length === 0) return "?";
		
		// If the name contains spaces, take the first letter of each word
		const words = cleaned.split(/\s+/);
		if (words.length > 1) {
			return (words[0][0] + words[1][0]).toUpperCase();
		}
		
		// Otherwise, take the first 2 letters
		return cleaned.slice(0, 2).toUpperCase();
	};

	// 3. Generate a unique color from the nickname
	// Simple hash: sum the ASCII codes of characters
	const getColorFromString = (str: string): string => {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			hash = str.charCodeAt(i) + ((hash << 5) - hash);
		}
		const hue = Math.abs(hash) % 360;
		return `hsl(${hue}, 65%, 50%)`;
	};

	const initials = getInitials(nickname);
	const backgroundColor = getColorFromString(nickname);

	// 4. If we have an image, display it
	if (src) {
		return (
			<div
				className={`${sizeClasses[size]} rounded-full overflow-hidden border-2 border-wood-700 flex-shrink-0 ${className}`}
			>
				<img
					src={src}
					alt={`${nickname}'s avatar`}
					className="w-full h-full object-cover"
					onError={(e) => {
						// If the image fails to load, hide it and display initials
						e.currentTarget.style.display = "none";
					}}
				/>
			</div>
		);
	}

	// 5. Otherwise, display initials with the generated color
	return (
		<div
			className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold text-white border-2 border-wood-700 flex-shrink-0 ${className}`}
			style={{ backgroundColor }}
			title={nickname}
		>
			{initials}
		</div>
	);
}
