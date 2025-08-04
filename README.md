# CustomBadges

A simple Vencord user plugin that allows you to add custom badges to Discord profiles with a dynamic badge creator.

## Features

- **Dynamic Badge Creation**: Click "Add Badge" to create new badges on-the-fly
- **Custom Icons**: Set any image URL as badge icons (recommended: 64x64 PNG)
- **Custom Emojis**: Paste any emoji to use as badge icons
- **Custom Names**: Choose the tooltip text that appears when hovering over each badge
- **Toggle Visibility**: Show or hide badges on your own profile or all profiles
- **Smart Priority**: Image URLs take priority over emojis when both are provided
- **Individual Control**: Each badge can be configured and removed independently
- **Visual Separation**: Clean interface with separated badge containers

## How to Use

1. **Enable the Plugin**:
   - Go to Vencord Settings → Plugins
   - Find "CustomBadges" and enable it

2. **Create Your Badges**:
   - Go to the CustomBadges settings
   - Click the **"Add Badge"** button to create a new badge
   - **For each badge you create:**
     - **Badge Name**: Enter the tooltip text that appears on hover
     - **Badge Emoji**: Paste any emoji (like 🎮, ⭐, 💎, 👁️, etc.) - easiest option!
     - **Badge Image URL**: Enter a custom image URL (overrides emoji if provided)
   - Click **"Remove"** to delete any badge you don't want
   - **Global Settings:**
     - Toggle **Show on Self** to display badges on your own profile
     - Toggle **Show on Others** to display badges on all profiles

3. **Manage Your Badges**:
   - Each badge appears in its own separated container for easy management
   - Add as many badges as you want with the "Add Badge" button
   - Remove individual badges with their "Remove" button
   - Image URLs take priority over emojis when both are provided

4. **View Your Badges**:
   - Your custom badges will appear on profiles alongside Discord's native badges
   - Only configured badges (with names and icons) will be displayed

## Settings

**Badge Creator Interface:**
- **Add Badge Button**: Click to create a new badge
- **Remove Button**: Click to delete any specific badge

**For Each Badge:**
- **Badge Name**: The tooltip text shown when hovering over the badge
- **Badge Emoji**: Any emoji to use as badge icon (converted to high-quality image automatically)  
- **Badge Image URL**: URL to your custom badge image (overrides emoji, works best with 64x64 PNG images)

**Global Settings:**
- **Show on Self**: Whether to display badges on your own profile
- **Show on Others**: Whether to display badges on all user profiles (fun for trolling or showing off)

## Examples

**Image URLs:**
- `https://cdn.discordapp.com/emojis/123456789.png` (Discord custom emojis)
- `https://github.com/user.png` (GitHub profile pictures)
- Any publicly accessible PNG/JPG image

**Emojis:**
- 🎮 (Gaming)
- ⭐ (Star)
- 💎 (Diamond)
- 🔥 (Fire)
- 💻 (Developer)
- 🎵 (Music)
- ⚡ (Lightning)
- 🌟 (Sparkle)
- 👁️ (Eye)
- Any emoji from your keyboard!

**Example Badge Creation Workflow:**

1. Click "Add Badge" → Create "Gamer" badge with 🎮 emoji
2. Click "Add Badge" → Create "Developer" badge with 💻 emoji  
3. Click "Add Badge" → Create "Music Lover" badge with 🎵 emoji

Or mix emojis and custom images:
1. Click "Add Badge" → Create "VIP" badge with custom image URL
2. Click "Add Badge" → Create "Verified" badge with ✅ emoji
3. Click "Add Badge" → Create "Pro" badge with ⚡ emoji

**Dynamic Management:**
- Want to remove the "Developer" badge? Click its "Remove" button
- Want to add more? Click "Add Badge" again
- Each badge is in its own container for easy organization

## Notes

- **🚨 IMPORTANT**: This is a client-side only modification - **other users cannot see your custom badges**
- Your badges are stored locally on your device and are only visible to you
- **Cross-user visibility is impossible** due to Discord client limitations (each user's data is stored locally)
- Badges appear alongside Discord's native badges in the order you create them
- **Emoji badges**: Automatically converted to high-quality Twemoji images (72x72px)
- **Image badges**: For best results, use square images (64x64 pixels recommended)
- Make sure your image URLs are publicly accessible (no authentication required)
- **Dynamic system**: Create as many or as few badges as you want with the "Add Badge" button
- **Clean interface**: Each badge has its own separated container with individual controls

