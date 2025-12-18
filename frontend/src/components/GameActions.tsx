import React from "react";
import Button from "./ui/Button";
import Card from "./ui/Card";

interface GameActionsProps {
	onLocal: () => void;
	onOnline: () => void;
	disabled?: boolean;
}

/**
 * Game action buttons (Local/Online match)
 */
export default function GameActions({ onLocal, onOnline, disabled = false }: GameActionsProps) {
	return (
		<Card>
			<h2 className="text-xl font-bold mb-2 text-primary">Play Game</h2>
			<p className="text-sm text-wood-300 mb-4">
				Jump into a match immediately.
			</p>
			<div className="space-y-2">
				<Button 
					onClick={onLocal} 
					disabled={disabled} 
					className="w-full"
				>
					Play Local Match
				</Button>
				<Button 
					onClick={onOnline} 
					disabled={disabled} 
					className="w-full"
				>
					Find Online Match
				</Button>
			</div>
		</Card>
	);
}
