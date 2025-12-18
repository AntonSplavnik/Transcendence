import React, { useState, useEffect } from "react";
import PlayerProfile from "./PlayerProfile";
import PlayerStats from "./PlayerStats";
import GameHistory from "./GameHistory";
import GameActions from "./GameActions";

interface UserStats {
	games_played: number;
	total_kills: number;
	total_time_played: number;
	last_game_kills: number;
	last_game_time: number;
	last_game_at: string | null;
}

interface GameHistoryItem {
	id: number;
	kills: number;
	time_played: number;
	played_at: string;
}

interface UserData {
	id: number;
	nickname: string;
	email: string;
	avatar_url?: string | null;
	stats: UserStats | null;
}

export default function Home({ onLocal, onLogout, onOnline }: { onLocal: () => void; onLogout: () => void; onOnline: () => void }) {
	const [user, setUser] = useState<UserData | null>(null);
	const [history, setHistory] = useState<GameHistoryItem[]>([]);
	const [loadingUser, setLoadingUser] = useState(true);
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const [logoutError, setLogoutError] = useState("");

	// Fetch user data on component mount
	useEffect(() => {
		fetchUserData();
	}, []);

	const fetchUserData = async () => {
		try {
			// Fetch user info and stats
			const userResponse = await fetch('/api/user/me', {
				credentials: 'include',
			});

			if (userResponse.ok) {
				const data = await userResponse.json();
				console.log('👤 User data:', data);
				
				// Backend returns nested structure: { user: {...}, stats: {...}, session: {...} }
				const userPayload: UserData = {
					id: data.user.id,
					nickname: data.user.nickname,
					email: data.user.email,
					avatar_url: data.user.avatar_url,
					stats: data.stats ?? null,
				};
				setUser(userPayload);
			} else {
				console.error('❌ Failed to fetch user data');
			}

			// Fetch game history
			const historyResponse = await fetch('/api/game/history', {
				credentials: 'include',
			});

			if (historyResponse.ok) {
				const historyData = await historyResponse.json();
				console.log('🎮 Game history:', historyData);
				setHistory(historyData);
			} else {
				console.error('❌ Failed to fetch game history');
			}
		} catch (error) {
			console.error('❌ Network error:', error);
		} finally {
			setLoadingUser(false);
		}
	};

	const handleLogout = async () => {
		setIsLoggingOut(true);
		setLogoutError("");

		try {
			const token = localStorage.getItem('authToken');
			const response = await fetch('/api/auth/logout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token }),
			});

			if (response.ok) {
				onLogout();
			} else {
				setLogoutError("Logout failed. Please try again.");
			}
		} catch (error) {
			console.error("An error occurred during logout:", error);
			setLogoutError('Server error. Please check your connection or try again later.');
		} finally {
			setIsLoggingOut(false);
		}
	};

	if (loadingUser) {
		return (
			<div className="min-h-screen bg-wood-900 flex items-center justify-center">
				<p className="text-2xl text-primary">Loading stats...</p>
			</div>
		);
	}

	if (!user) {
		return (
			<div className="min-h-screen bg-wood-900 flex items-center justify-center">
				<p className="text-2xl text-red-500">Failed to load user data</p>
			</div>
		);
	}

	return (
		<main className="p-6 max-w-4xl mx-auto w-full">
			<PlayerProfile 
				user={user} 
				onLogout={handleLogout}
				onProfileUpdate={fetchUserData}
				isLoggingOut={isLoggingOut}
			/>

			{logoutError && (
				<div className="bg-red-900/20 border border-red-500 text-red-200 px-4 py-2 rounded mb-6">
					{logoutError}
				</div>
			)}

			<section className="grid gap-6 md:grid-cols-2 mb-8">
				<GameActions 
					onLocal={onLocal} 
					onOnline={onOnline} 
				/>
				<GameHistory history={history} />
			</section>

			<PlayerStats stats={user.stats} />
		</main>
	);
}
