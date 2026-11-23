export function getGiftIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id') || params.get('giftId') || params.get('uid') || '';
}

export async function getGiftChristmasById(id) {
    if (!id) return null;
    try {
        const res = await fetch(`/api/gift/${id}`);
        if (res.ok) {
            const data = await res.json();
            return data.gift || data;
        }
    } catch (e) {
        console.warn('API error:', e);
    }
    return window.giftChristmasData || null;
}
