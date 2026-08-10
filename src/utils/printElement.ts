/**
 * Opens the browser's own print dialog for one element.
 *
 * `window.print()` would send the whole dashboard — sidebar, navbar and all —
 * so the element is cloned into a hidden iframe together with the page's
 * stylesheets, and that iframe is printed instead. The user gets the native
 * dialog and can pick a real printer or "Save as PDF" themselves.
 */

/** Stylesheets are fetched fresh inside the iframe; printing without waiting
 *  for them sends unstyled markup. Past this the dialog opens regardless so a
 *  single dead asset cannot swallow the print. */
const STYLE_TIMEOUT_MS = 3000;

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
    // with it or it prints unstyled. The document written here has no URL of
    // its own, so a copied `<link href="/_next/...">` would resolve against
    // about:blank and 404 — the hrefs are read off the DOM nodes instead,
    // where they are already absolute.
    const styles = Array.from(
        document.querySelectorAll<HTMLElement>(
            'link[rel="stylesheet"], style'
        )
    )
        .map((node) =>
            node instanceof HTMLLinkElement
                ? `<link rel="stylesheet" href="${node.href}">`
                : node.outerHTML
        )
        .join("");

    doc.open();
    doc.write(
        `<!doctype html><html><head><title>${title}</title>` +
        `<base href="${document.baseURI}">${styles}` +
        `<style>` +
        `body{margin:0;padding:16px;background:#fff;}` +
        // Coloured headers and status pills are part of the invoice, so the
        // browser is told to keep them rather than drop them for ink.
        `*{-webkit-print-color-adjust:exact;print-color-adjust:exact;}` +
        `@page{margin:12mm;}` +
        `</style></head>` +
        `<body>${element.outerHTML}</body></html>`
    );
    doc.close();

    let printed = false;
    const print = () => {
        if (printed) return;
        printed = true;
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        // The dialog reads from the iframe, so it cannot be torn down until
        // the browser has taken the document.
        window.setTimeout(() => iframe.remove(), 1000);
    };

    const links = Array.from(doc.querySelectorAll("link[rel='stylesheet']"));
    if (links.length === 0) {
        print();
        return;
    }

    let settled = 0;
    const onSettled = () => {
        settled += 1;
        if (settled === links.length) print();
    };

    links.forEach((link) => {
        // A stylesheet already in the browser cache can finish before the
        // listener is attached, so the loaded state is checked directly.
        const sheet = (link as HTMLLinkElement).sheet;
        if (sheet) {
            onSettled();
            return;
        }
        link.addEventListener("load", onSettled, { once: true });
        link.addEventListener("error", onSettled, { once: true });
    });

    window.setTimeout(print, STYLE_TIMEOUT_MS);
};
