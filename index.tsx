/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { UserStore } from "@webpack/common";
import { Button, Forms, React, TextInput } from "@webpack/common";

interface Badge {
    id: string;
    name: string;
    emoji: string;
    icon: string;
}

// Helper function to convert emoji to Twemoji image URL
function emojiToImageUrl(emoji: string): string {
    if (!emoji) return "";
    
    // Handle Unicode emojis with proper codepoint conversion
    // Remove variation selectors and other modifiers that can cause issues
    const cleanEmoji = emoji.replace(/[\uFE00-\uFE0F\u200D]/g, '');
    
    const codePoints = [...cleanEmoji]
        .map(char => {
            const codePoint = char.codePointAt(0);
            if (!codePoint) return null;
            return codePoint.toString(16);
        })
        .filter(Boolean)
        .join('-');
    
    // Return Twemoji CDN URL
    return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${codePoints}.png`;
}

// Badge Management Component
function BadgeManager({ setValue }: { setValue: (value: Badge[]) => void }) {
    const [badges, setBadges] = React.useState<Badge[]>(settings.store.badges || []);

    const updateBadges = (newBadges: Badge[]) => {
        setBadges(newBadges);
        setValue(newBadges);
    };

    const addBadge = () => {
        const newBadge: Badge = {
            id: Date.now().toString(),
            name: "",
            emoji: "",
            icon: ""
        };
        updateBadges([...badges, newBadge]);
    };

    const removeBadge = (id: string) => {
        updateBadges(badges.filter(badge => badge.id !== id));
    };

    const updateBadge = (id: string, field: keyof Badge, value: string) => {
        updateBadges(badges.map(badge => 
            badge.id === id ? { ...badge, [field]: value } : badge
        ));
    };

    return (
        <Forms.FormSection>
            <Forms.FormTitle tag="h3">Custom Badges</Forms.FormTitle>
            <Forms.FormText>Create custom badges to display on profiles. You can add multiple badges with different names and icons.</Forms.FormText>
            
            {badges.map((badge, index) => (
                <div key={badge.id} style={{ 
                    marginBottom: "20px", 
                    padding: "15px", 
                    border: "1px solid var(--background-modifier-accent)", 
                    borderRadius: "8px",
                    backgroundColor: "var(--background-secondary-alt)"
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                        <Forms.FormTitle tag="h4" style={{ margin: 0 }}>Badge {index + 1}</Forms.FormTitle>
                        <Button
                            color={Button.Colors.RED}
                            size={Button.Sizes.SMALL}
                            onClick={() => removeBadge(badge.id)}
                        >
                            Remove
                        </Button>
                    </div>
                    
                    <Forms.FormSection>
                        <Forms.FormTitle tag="h5">Badge Name</Forms.FormTitle>
                        <TextInput
                            placeholder="Enter badge name/tooltip..."
                            value={badge.name}
                            onChange={(value: string) => updateBadge(badge.id, 'name', value)}
                        />
                    </Forms.FormSection>

                    <Forms.FormSection>
                        <Forms.FormTitle tag="h5">Badge Emoji</Forms.FormTitle>
                        <TextInput
                            placeholder="🎮"
                            value={badge.emoji}
                            onChange={(value: string) => updateBadge(badge.id, 'emoji', value)}
                        />
                        <Forms.FormText>Paste any emoji to use as the badge icon</Forms.FormText>
                    </Forms.FormSection>

                    <Forms.FormSection>
                        <Forms.FormTitle tag="h5">Badge Image URL (Optional)</Forms.FormTitle>
                        <TextInput
                            placeholder="https://example.com/badge.png"
                            value={badge.icon}
                            onChange={(value: string) => updateBadge(badge.id, 'icon', value)}
                        />
                        <Forms.FormText>Custom image URL (overrides emoji if provided)</Forms.FormText>
                    </Forms.FormSection>
                </div>
            ))}

            <Button
                color={Button.Colors.GREEN}
                size={Button.Sizes.MEDIUM}
                onClick={addBadge}
            >
                Add Badge
            </Button>
        </Forms.FormSection>
    );
}

const settings = definePluginSettings({
    badges: {
        type: OptionType.COMPONENT,
        component: BadgeManager,
        default: [] as Badge[]
    },
    showOnSelf: {
        type: OptionType.BOOLEAN,
        description: "Show badges on your own profile",
        default: true
    },
    showOnOthers: {
        type: OptionType.BOOLEAN,
        description: "Show badges on all user profiles (not just your own)",
        default: false
    }
});

export default definePlugin({
    name: "CustomBadges",
    description: "Add custom badges to profiles with a dynamic badge creator",
    authors: [Devs.Ven],
    settings,

    userProfileBadge: {
        description: "Custom Badge",
        image: "",
        getBadges: ({ userId }) => {
            const currentUserId = UserStore.getCurrentUser()?.id;
            const isCurrentUser = userId === currentUserId;
            
            // Check if we should show badges
            const shouldShow = 
                (isCurrentUser && settings.store.showOnSelf) ||
                (!isCurrentUser && settings.store.showOnOthers);
            
            if (!shouldShow) {
                return [];
            }

            const configuredBadges = settings.store.badges || [];
            
            return configuredBadges
                .filter((badge: Badge) => badge.name && (badge.emoji || badge.icon))
                .map((badge: Badge) => {
                    // Determine badge icon: Image URL takes priority over emoji
                    let badgeIconSource = "";
                    if (badge.icon) {
                        badgeIconSource = badge.icon;
                    } else if (badge.emoji) {
                        badgeIconSource = emojiToImageUrl(badge.emoji);
                    }

                    return {
                        description: badge.name,
                        image: badgeIconSource,
                        onClick: () => {
                            console.log(`Custom badge "${badge.name}" clicked!`);
                        }
                    };
                });
        }
    }
});