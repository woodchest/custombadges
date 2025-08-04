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

// Global badges storage - all users' badges in one object
interface GlobalBadgeStorage {
    [userId: string]: Badge[];
}

// Load badges for any user from global storage
async function loadUserBadges(userId: string): Promise<Badge[]> {
    console.log(`[CustomBadges] 🔍 Loading badges for user: ${userId}`);
    
    // Check cache first
    const cached = badgeCache.get(userId);
    const cacheTime = cacheTimestamps.get(userId);
    if (cached && cacheTime && (Date.now() - cacheTime) < CACHE_DURATION) {
        console.log(`[CustomBadges] ✅ Using cached badges for ${userId}:`, cached.length);
        return cached;
    }

    try {
        // Use a single global key for ALL users' badges
        const globalBadges = await DataStore.get<GlobalBadgeStorage>("CustomBadges_GlobalStorage") || {};
        console.log(`[CustomBadges] 📦 Global badge storage keys:`, Object.keys(globalBadges));
        console.log(`[CustomBadges] 📦 Full global storage:`, globalBadges);
        
        let userBadges = globalBadges[userId] || [];
        console.log(`[CustomBadges] 👤 Badges for user ${userId} from global storage:`, userBadges);
        
        // MIGRATION: If no badges in global storage, try to migrate from old storage
        if (userBadges.length === 0) {
            console.log(`[CustomBadges] 🔄 No badges in global storage, checking old storage for ${userId}`);
            const oldBadges = await DataStore.get(`customBadges_${userId}`);
            console.log(`[CustomBadges] 📂 Old storage result for ${userId}:`, oldBadges);
            
            if (oldBadges && oldBadges.length > 0) {
                console.log(`[CustomBadges] 🚚 Migrating ${oldBadges.length} badges from old storage for ${userId}`);
                
                // Add to global storage
                globalBadges[userId] = oldBadges;
                await DataStore.set("CustomBadges_GlobalStorage", globalBadges);
                
                // Clean up old storage
                await DataStore.del(`customBadges_${userId}`);
                
                userBadges = oldBadges;
                console.log(`[CustomBadges] ✅ Migration complete for ${userId}`);
            }
        }
        
        // Cache the result
        badgeCache.set(userId, userBadges);
        cacheTimestamps.set(userId, Date.now());
        
        console.log(`[CustomBadges] 💾 Final cached ${userBadges.length} badges for ${userId}:`, userBadges);
        
        // Log prominently if we found badges for another user
        const currentUserId = UserStore.getCurrentUser()?.id;
        if (userId !== currentUserId && userBadges.length > 0) {
            console.log(`[CustomBadges] 🎉 FOUND ${userBadges.length} badges for OTHER USER ${userId}!`);
        }
        
        return userBadges;
    } catch (error) {
        console.error(`[CustomBadges] ❌ Failed to load badges for user ${userId}:`, error);
        const emptyBadges: Badge[] = [];
        badgeCache.set(userId, emptyBadges);
        cacheTimestamps.set(userId, Date.now());
        return emptyBadges;
    }
}

// Save badges for current user to global storage
async function saveUserBadges(userId: string, badges: Badge[]): Promise<void> {
    try {
        console.log(`[CustomBadges] 💾 Saving ${badges.length} badges for user ${userId}`);
        
        // Load existing global storage
        const globalBadges = await DataStore.get<GlobalBadgeStorage>("CustomBadges_GlobalStorage") || {};
        
        // Update this user's badges
        globalBadges[userId] = badges;
        
        // Save back to global storage
        await DataStore.set("CustomBadges_GlobalStorage", globalBadges);
        
        // Update cache
        badgeCache.set(userId, badges);
        cacheTimestamps.set(userId, Date.now());
        
        console.log(`[CustomBadges] ✅ Successfully saved badges for ${userId} to global storage`);
        console.log(`[CustomBadges] 📊 Global storage now contains:`, Object.keys(globalBadges).length, "users");
    } catch (error) {
        console.error(`[CustomBadges] ❌ Failed to save badges for user ${userId}:`, error);
        throw error;
    }
}

function BadgeSettings() {
    const [badges, setBadges] = React.useState<Badge[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [saveMessage, setSaveMessage] = React.useState("");
    const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);

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
                        // Save the defaults using global storage
                        await saveUserBadges(currentUserId, defaultBadges);
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
        // DON'T update userBadges here - only update when explicitly saving
        
        // Save to global storage
        try {
            const currentUserId = UserStore.getCurrentUser()?.id;
            if (currentUserId) {
                await saveUserBadges(currentUserId, newBadges);
                // Only update userBadges after successful save
                userBadges = newBadges;
            } else {
                console.error(`[CustomBadges] No current user ID found - cannot save badges`);
            }
        } catch (error) {
            console.error("Failed to save badges:", error);
            throw error; // Re-throw so saveBadges can show error message
        }
    };

    const addBadge = () => {
        const newBadges = [...badges, { name: "", emoji: "", url: "" }];
        setBadges(newBadges); // Only update UI, don't save yet
        setHasUnsavedChanges(true);
    };

    const removeBadge = (index: number) => {
        const newBadges = badges.filter((_, i) => i !== index);
        setBadges(newBadges); // Only update UI, don't save yet
        setHasUnsavedChanges(true);
    };

    const updateBadge = (index: number, field: keyof Badge, value: string) => {
        const newBadges = [...badges];
        newBadges[index][field] = value;
        setBadges(newBadges); // Only update UI, don't save yet
        setHasUnsavedChanges(true);
    };

    const saveBadges = async () => {
        setSaveMessage("Saving...");
        try {
            await updateBadges(badges); // Now save to DataStore
            setHasUnsavedChanges(false); // Clear unsaved changes flag
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
            <style>{`
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.7; }
                    100% { opacity: 1; }
                }
            `}</style>
            <Forms.FormTitle>Custom Badges</Forms.FormTitle>
            <Forms.FormText>
                Create and manage your custom profile badges. Note: Badges are only visible to you (client-side only). Image URLs override emojis when provided. Click "Save Badges" to make changes permanent.
                {hasUnsavedChanges && (
                    <span style={{ 
                        color: "#faa61a", 
                        fontWeight: "500",
                        marginLeft: "8px"
                    }}>
                        ⚠️ You have unsaved changes!
                    </span>
                )}
            </Forms.FormText>
            
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
                    color={hasUnsavedChanges ? Button.Colors.GREEN : Button.Colors.BRAND}
                    onClick={saveBadges}
                    style={hasUnsavedChanges ? { 
                        animation: "pulse 1.5s infinite",
                        boxShadow: "0 0 10px rgba(67, 181, 129, 0.5)"
                    } : {}}
                >
                    💾 {hasUnsavedChanges ? "Save Changes" : "Save Badges"}
                </Button>
                                 {saveMessage && (
                     <span style={{ 
                         marginLeft: "12px",
                         color: saveMessage.includes("✅") ? "#43b581" : saveMessage.includes("❌") ? "#f04747" : "var(--text-normal)",
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
    description: "Create custom badges for your profile - visible only to you (client-side only)",
    authors: [Devs.Ven],
    settings,

    async start() {
        console.log("[CustomBadges] Plugin starting...");
        
        // Load current user's badges on plugin start using global storage
        try {
            const currentUserId = UserStore.getCurrentUser()?.id;
            console.log(`[CustomBadges] 🚀 Plugin starting for user: ${currentUserId}`);
            
            if (currentUserId) {
                const badges = await loadUserBadges(currentUserId);
                console.log(`[CustomBadges] 📋 Loaded ${badges.length} badges for current user`);
                
                userBadges = badges;
                
                // If no badges exist, create defaults and save them
                if (badges.length === 0) {
                    console.log(`[CustomBadges] 🆕 No badges found, creating defaults`);
                    const defaultBadges = [
                        { name: "Gaming", emoji: "🎮", url: "" },
                        { name: "Developer", emoji: "💻", url: "" }
                    ];
                    userBadges = defaultBadges;
                    await saveUserBadges(currentUserId, defaultBadges);
                    console.log(`[CustomBadges] ✅ Created default badges for ${currentUserId}`);
                }
            }
        } catch (error) {
            console.error("[CustomBadges] ❌ Failed to load badges on start:", error);
        }

                 addProfileBadge({
             description: "Custom Badges",
             shouldShow: ({ userId }) => {
                 // Only show badges for the current user (since cross-user visibility is impossible)
                 const currentUserId = UserStore.getCurrentUser()?.id;
                 return userId === currentUserId;
             },
             getBadges: ({ userId }) => {
                 const currentUserId = UserStore.getCurrentUser()?.id;
                 
                 // Only show badges for current user (DataStore is local-only)
                 if (userId !== currentUserId) {
                     return [];
                 }
                 
                 return userBadges
                     .filter(badge => badge.name && (badge.emoji || badge.url))
                     .map(badge => ({
                         description: badge.name,
                         image: badge.url || emojiToImageUrl(badge.emoji),
                         onClick: () => console.log(`${badge.name} badge clicked!`)
                     }));
             }
         });
    }
});