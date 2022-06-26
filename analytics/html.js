let startLoadTime = Date.now();

window.addEventListener('load', () => {
    let dt = Date.now() - startLoadTime;

    fetch('https://dns.phazed.xyz/api/v1/analytics/page?url='+window.location.href+'&loadTime='+dt, { method: 'POST' }).then(data => data.json()).then(data => {
        console.log('[VOXEL]', 'Registered page');
    })
});