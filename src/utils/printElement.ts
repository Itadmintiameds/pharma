/**
 * Opens the browser's own print dialog for one element.
 *
 * `window.print()` would send the whole dashboard — sidebar, navbar and all —
 * so the element is cloned into a hidden iframe together with the page's
 * stylesheets, and that iframe is printed instead. The user gets the native
 * dialog and can pick a real printer or "Save as PDF" themselves.
 */
export const printElement = (element: HTMLElement, title = "Invoice") => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText =
        "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;
    if (!doc) {
        iframe.remove();
        throw new Error("Could not open the print view.");
    }

    // The clone is inert markup, so the page's own stylesheets have to travel
    // with it or it prints unstyled.
    const styles = Array.from(
        document.querySelectorAll('link[rel="stylesheet"], style')
    )
        .map((node) => node.outerHTML)
        .join("");

    doc.open();
    doc.write(
        `<!doctype html><html><head><title>${title}</title>${styles}` +
        `<style>body{margin:0;padding:16px;background:#fff;}</style></head>` +
        `<body>${element.outerHTML}</body></html>`
    );
    doc.close();

    const print = () => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        // The dialog reads from the iframe, so it cannot be torn down until
        // the browser has taken the document.
        window.setTimeout(() => iframe.remove(), 1000);
    };

    // Stylesheets load asynchronously; printing before they land loses them.
    if (doc.readyState === "complete") print();
    else iframe.addEventListener("load", print, { once: true });
};
