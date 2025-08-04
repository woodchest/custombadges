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

import { addProfileBadge } from "@api/Badges";
import * as DataStore from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { React, TextInput, Button, Forms, UserStore } from "@webpack/common";

interface Badge {
    name: string;
    emoji: string;
    url: string;
}

// Helper function to convert emoji to Twemoji image URL
function emojiToImageUrl(emoji: string): string {
    if (!emoji) return "";
    
    // Handle Unicode emojis with proper codepoint conversion
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

// Persistent badge storage per user
let userBadges: Badge[] = [];

// Cache for other users' badges (for performance)
const badgeCache = new Map<string, Badge[]>();
const cacheTimestamps = new Map<string, number>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Load badges for any user
async function loadUserBadges(userId: string): Promise<Badge[]> {
    console.log(`[CustomBadges] loadUserBadges called for: ${userId}`);
    
    // Check cache first
    const cached = badgeCache.get(userId);
    const cacheTime = cacheTimestamps.get(userId);
    if (cached && cacheTime && (Date.now() - cacheTime) < CACHE_DURATION) {
        console.log(`[CustomBadges] Using cached badges for ${userId}:`, cached.length);
        return cached;
    }

    try {
        const dataStoreKey = `customBadges_${userId}`;
        console.log(`[CustomBadges] 🔍 Loading badges from DataStore for ${userId} with key: ${dataStoreKey}`);
        
        const rawData = await DataStore.get(dataStoreKey);
        console.log(`[CustomBadges] 📦 Raw DataStore response for ${userId}:`, rawData, typeof rawData);
        
        const badges = rawData || [];
        console.log(`[CustomBadges] ✅ Processed badges for ${userId}:`, badges);
        console.log(`[CustomBadges] 📊 Final badge count for ${userId}: ${badges.length}`);
        
        // Always cache the result, even if empty
        badgeCache.set(userId, badges);
        cacheTimestamps.set(userId, Date.now());
        
        console.log(`[CustomBadges] 💾 Successfully cached ${badges.length} badges for ${userId}`);
        
        // If this is another user and they have badges, log it prominently
        const currentUserId = UserStore.getCurrentUser()?.id;
        if (userId !== currentUserId && badges.length > 0) {
            console.log(`[CustomBadges] 🎉 FOUND ${badges.length} badges for OTHER USER ${userId}:`, badges);
        }
        
        return badges;
    } catch (error) {
        console.error(`[CustomBadges] ❌ Failed to load badges for user ${userId}:`, error);
        const emptyBadges: Badge[] = [];
        badgeCache.set(userId, emptyBadges);
        cacheTimestamps.set(userId, Date.now());
        return emptyBadges;
    }
}

function BadgeSettings() {
    const [badges, setBadges] = React.useState<Badge[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [saveMessage, setSaveMessage] = React.useState("");

    // Load badges from persistent storage on component mount
    React.useEffect(() => {
        const loadBadges = async () => {
            try {
                const currentUserId = UserStore.getCurrentUser()?.id;
                if (currentUserId) {
                    const stored = await loadUserBadges(currentUserId);
                    if (stored.length === 0) {
                        // If no badges exist, create default ones
                        const defaultBadges = [
                            { name: "Gaming", emoji: "🎮", url: "" },
                            { name: "Developer", emoji: "💻", url: "" }
                        ];
                        setBadges(defaultBadges);
                        userBadges = defaultBadges;
                        // Save the defaults
                        await DataStore.set(`customBadges_${currentUserId}`, defaultBadges);
                        badgeCache.set(currentUserId, defaultBadges);
                        cacheTimestamps.set(currentUserId, Date.now());
                    } else {
                        setBadges(stored);
                        userBadges = stored;
                    }
                }
            } catch (error) {
                console.error("Failed to load badges:", error);
                // Fallback to default badges
                const defaultBadges = [
                    { name: "Gaming", emoji: "🎮", url: "" },
                    { name: "Developer", emoji: "💻", url: "" }
                ];
                setBadges(defaultBadges);
                userBadges = defaultBadges;
            }
            setLoading(false);
        };
        loadBadges();
    }, []);

    const updateBadges = async (newBadges: Badge[]) => {
        setBadges(newBadges);
        userBadges = newBadges;
        
        // Save to persistent storage and update cache
        try {
            const currentUserId = UserStore.getCurrentUser()?.id;
            console.log(`[CustomBadges] Saving ${newBadges.length} badges for user: ${currentUserId}`);
            
            if (currentUserId) {
                const dataStoreKey = `customBadges_${currentUserId}`;
                await DataStore.set(dataStoreKey, newBadges);
                
                // Update cache so other views show the changes immediately
                badgeCache.set(currentUserId, newBadges);
                cacheTimestamps.set(currentUserId, Date.now());
                console.log(`[CustomBadges] Successfully saved and cached badges`);
            } else {
                console.error(`[CustomBadges] No current user ID found - cannot save badges`);
            }
        } catch (error) {
            console.error("Failed to save badges:", error);
        }
    };

    const addBadge = () => {
        const newBadges = [...badges, { name: "", emoji: "", url: "" }];
        setBadges(newBadges); // Only update UI, don't save yet
    };

    const removeBadge = (index: number) => {
        const newBadges = badges.filter((_, i) => i !== index);
        setBadges(newBadges); // Only update UI, don't save yet
    };

    const updateBadge = (index: number, field: keyof Badge, value: string) => {
        const newBadges = [...badges];
        newBadges[index][field] = value;
        setBadges(newBadges); // Only update UI, don't save yet
    };

    const saveBadges = async () => {
        setSaveMessage("Saving...");
        try {
            await updateBadges(badges); // Now save to DataStore
            setSaveMessage("✅ Saved successfully!");
            setTimeout(() => setSaveMessage(""), 3000); // Clear message after 3 seconds
        } catch (error) {
            setSaveMessage("❌ Save failed!");
            setTimeout(() => setSaveMessage(""), 3000);
        }
    };

    if (loading) {
        return (
            <Forms.FormSection>
                <Forms.FormTitle>Custom Badges</Forms.FormTitle>
                <Forms.FormText>Loading your badges...</Forms.FormText>
            </Forms.FormSection>
        );
    }

    return (
        <Forms.FormSection>
            <Forms.FormTitle>Custom Badges</Forms.FormTitle>
            <Forms.FormText>Create and manage your custom profile badges. Your badges will be visible to anyone else using this plugin! Image URLs override emojis when provided. Click "Save Badges" to make changes permanent.</Forms.FormText>
            
            {badges.map((badge, index) => (
                <div key={index} style={{ 
                    marginBottom: "12px", 
                    padding: "12px", 
                    backgroundColor: "var(--background-secondary)", 
                    borderRadius: "6px",
                    border: "1px solid var(--background-modifier-accent)"
                }}>
                    <div style={{ 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center", 
                        marginBottom: "8px" 
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <Forms.FormTitle tag="h5" style={{ margin: 0, color: "var(--header-primary)" }}>Badge {index + 1}</Forms.FormTitle>
                            {(badge.url || badge.emoji) && (
                                <img 
                                    src={badge.url || emojiToImageUrl(badge.emoji)} 
                                    alt="Badge preview"
                                    style={{ width: "20px", height: "20px", objectFit: "cover", borderRadius: "50%" }}
                                    onError={(e) => {
                                        // If custom URL fails, fallback to emoji
                                        if (badge.url && badge.emoji) {
                                            e.currentTarget.src = emojiToImageUrl(badge.emoji);
                                        }
                                    }}
                                />
                            )}
                        </div>
                        <Button
                            size={Button.Sizes.SMALL}
                            color={Button.Colors.RED}
                            onClick={() => removeBadge(index)}
                        >
                            Remove
                        </Button>
                    </div>
                    <TextInput
                        placeholder="Badge name (e.g., Gaming Pro)"
                        value={badge.name}
                        onChange={(value: string) => updateBadge(index, 'name', value)}
                        style={{ marginBottom: "8px" }}
                    />
                    <TextInput
                        placeholder="Emoji (🎮)"
                        value={badge.emoji}
                        onChange={(value: string) => {
                            // Limit to 1 character/emoji only
                            const singleChar = [...value].slice(0, 1).join('');
                            updateBadge(index, 'emoji', singleChar);
                        }}
                        maxLength={2} // Allow for some emoji that might be 2 chars
                        style={{ marginBottom: "8px" }}
                    />
                    <TextInput
                        placeholder="Image URL (optional - overrides emoji)"
                        value={badge.url}
                        onChange={(value: string) => updateBadge(index, 'url', value)}
                    />
                </div>
            ))}
            
            <div style={{ marginTop: "16px", display: "flex", gap: "12px" }}>
                <Button
                    size={Button.Sizes.MEDIUM}
                    color={Button.Colors.GREEN}
                    onClick={addBadge}
                >
                    ➕ Add New Badge
                </Button>
                <Button
                    size={Button.Sizes.MEDIUM}
                    color={Button.Colors.BRAND}
                    onClick={saveBadges}
                >
                    💾 Save Badges
                </Button>
                {saveMessage && (
                    <span style={{ 
                        marginLeft: "12px",
                        color: saveMessage.includes("✅") ? "var(--text-positive)" : saveMessage.includes("❌") ? "var(--text-danger)" : "var(--text-muted)",
                        fontWeight: "500"
                    }}>
                        {saveMessage}
                    </span>
                )}
            </div>
        </Forms.FormSection>
    );
}

const settings = definePluginSettings({
    badges: {
        type: OptionType.COMPONENT,
        component: BadgeSettings,
        description: "Manage your custom badges"
    }
});

export default definePlugin({
    name: "CustomBadges",
    description: "Create custom badges for your profile - visible to other plugin users!",
    authors: [Devs.Ven],
    settings,

    async start() {
        console.log("[CustomBadges] Plugin starting...");
        
        // Load current user's badges on plugin start
        try {
            const currentUserId = UserStore.getCurrentUser()?.id;
            console.log(`[CustomBadges] Current user ID: ${currentUserId}`);
            
            if (currentUserId) {
                const badges = await DataStore.get(`customBadges_${currentUserId}`) || [
                    { name: "Gaming", emoji: "🎮", url: "" },
                    { name: "Developer", emoji: "💻", url: "" }
                ];
                console.log(`[CustomBadges] Loaded ${badges.length} badges for current user:`, badges);
                
                userBadges = badges;
                // Cache the current user's badges immediately
                badgeCache.set(currentUserId, badges);
                cacheTimestamps.set(currentUserId, Date.now());
                
                console.log(`[CustomBadges] Cached badges for current user ${currentUserId}`);
            }
        } catch (error) {
            console.error("[CustomBadges] Failed to load badges on start:", error);
            const defaultBadges = [
                { name: "Gaming", emoji: "🎮", url: "" },
                { name: "Developer", emoji: "💻", url: "" }
            ];
            userBadges = defaultBadges;
            const currentUserId = UserStore.getCurrentUser()?.id;
            if (currentUserId) {
                badgeCache.set(currentUserId, defaultBadges);
                cacheTimestamps.set(currentUserId, Date.now());
                console.log(`[CustomBadges] Set default badges for ${currentUserId}`);
            }
        }

        addProfileBadge({
            description: "Custom Badges",
            shouldShow: () => true, // Show badges for everyone using this plugin
            getBadges: ({ userId }) => {
                console.log(`[CustomBadges] getBadges called for user: ${userId}`);
                
                // Always try to load fresh data for cross-user visibility
                // Check if this is a different user than current user
                const currentUserId = UserStore.getCurrentUser()?.id;
                const isOtherUser = userId !== currentUserId;
                
                console.log(`[CustomBadges] Current user: ${currentUserId}, Target user: ${userId}, IsOtherUser: ${isOtherUser}`);
                
                // Check if we have cached badges for this user
                const cached = badgeCache.get(userId);
                const cacheTime = cacheTimestamps.get(userId);
                const cacheAge = cacheTime ? Date.now() - cacheTime : Infinity;
                
                console.log(`[CustomBadges] Cache status for ${userId}:`, { 
                    hasCached: !!cached, 
                    cacheAge: cacheAge,
                    badgeCount: cached ? cached.length : 0,
                    isStale: cacheAge > CACHE_DURATION
                });
                
                // For other users, always try to refresh if cache is old or missing
                if (isOtherUser && (!cached || cacheAge > CACHE_DURATION)) {
                    console.log(`[CustomBadges] Force loading fresh data for other user ${userId}`);
                    loadUserBadges(userId).then(badges => {
                        console.log(`[CustomBadges] Force loaded ${badges.length} badges for other user ${userId}`);
                        // TODO: Need to trigger badge refresh somehow
                    }).catch(error => {
                        console.error(`[CustomBadges] Force load failed for ${userId}:`, error);
                    });
                }
                
                // If we have cached data, use it
                if (cached) {
                    const validBadges = cached
                        .filter(badge => badge.name && (badge.emoji || badge.url))
                        .map(badge => ({
                            description: badge.name,
                            image: badge.url || emojiToImageUrl(badge.emoji),
                            onClick: () => console.log(`${badge.name} badge clicked!`)
                        }));
                    
                    console.log(`[CustomBadges] Returning ${validBadges.length} badges for ${userId}`, validBadges);
                    return validBadges;
                }
                
                // If no cache, try to load badges asynchronously
                console.log(`[CustomBadges] No cache for ${userId}, starting async load...`);
                loadUserBadges(userId).then(badges => {
                    console.log(`[CustomBadges] Async load completed: ${badges.length} badges for ${userId}`, badges);
                }).catch(error => {
                    console.error(`[CustomBadges] Async load failed for ${userId}:`, error);
                });
                
                console.log(`[CustomBadges] Returning empty array for ${userId} (no cache yet)`);
                return []; // No badges available yet
            }
        });
    }
});