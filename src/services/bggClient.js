import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';

const BGG_BASE = 'https://boardgamegeek.com/xmlapi2';
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

const bggRequest = (url, params) => {
    const headers = {
        'User-Agent': 'FirstPlayerOROPBot/1.0',
        'Accept': 'application/xml',
    };
    if (process.env.BGG_API_TOKEN) {
        headers['Authorization'] = `Bearer ${process.env.BGG_API_TOKEN}`;
    }
    return axios.get(`${BGG_BASE}${url}`, {
        params,
        headers,
        responseType: 'text',
    });
};

/**
 * Search BGG for a boardgame by title. Returns the best match's BGG ID.
 */
export const searchBgg = async (title) => {
    const { data: xml } = await bggRequest('/search', { query: title, type: 'boardgame', exact: 1 });

    const result = parser.parse(xml);
    const items = result?.items?.item;

    if (items) {
        // Can be a single object or array
        const first = Array.isArray(items) ? items[0] : items;
        return parseInt(first['@_id']);
    }

    // If exact match fails, try non-exact and take the first result
    const { data: xml2 } = await bggRequest('/search', { query: title, type: 'boardgame' });

    const result2 = parser.parse(xml2);
    const items2 = result2?.items?.item;

    if (!items2) return null;

    const first = Array.isArray(items2) ? items2[0] : items2;
    return parseInt(first['@_id']);
};

/**
 * Get boardgame details (image, thumbnail) from BGG by ID.
 */
export const getBggThing = async (bggId) => {
    const { data: xml } = await bggRequest('/thing', { id: bggId });

    const result = parser.parse(xml);
    const item = result?.items?.item;
    if (!item) return null;

    return {
        bggId,
        coverUrl: item.image || null,
        thumbnailUrl: item.thumbnail || null,
    };
};

/**
 * Search + get cover in one call. Returns { bggId, coverUrl, thumbnailUrl } or null.
 */
export const fetchBggCover = async (title) => {
    try {
        const bggId = await searchBgg(title);
        if (!bggId) return null;

        const thing = await getBggThing(bggId);
        return thing;
    } catch (error) {
        // Propagate rate limit errors so callers can handle them
        if (error.response?.status === 429) {
            throw error;
        }
        console.error(`[BGG] Failed to fetch cover for "${title}":`, error.message);
        return null;
    }
};
