export function getLuckyChanceIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id') || params.get('uid') || '';
}

export async function fetchLuckyChanceById(id) {
    if (!id) return { success: false, message: 'No ID' };
    try {
        const res = await fetch(`/api/gift/${id}`);
        if (res.ok) {
            const data = await res.json();
            return { success: true, data: data.gift || data };
        }
    } catch (e) {
        console.warn('[LuckyChance] fetch error:', e);
    }
    if (window.luckyChanceData) {
        return { success: true, data: window.luckyChanceData };
    }
    return { success: false, message: 'Not found' };
}
