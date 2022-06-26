let startLoadTime = Date.now();

window.addEventListener('load', () => {
    let dt = Date.now() - startLoadTime;

    fetch('http://192.168.11.13:100/api/v1/analytics/page?url='+window.location.href+'&loadTime='+dt, { method: 'POST' }).then(data => data.json()).then(data => {
        console.log('[VOXEL]', 'Registered page');
    })
});