<?php declare(strict_types=1);

require('vendor' . DIRECTORY_SEPARATOR . 'autoload.php');

use Dom\Attr;
use Dom\Element;
use Dom\HTMLDocument;
use Dom\Node;
use Dom\XPath;
use MatthiasMullie\Minify;

define('SOURCE_DIR', __DIR__ . DIRECTORY_SEPARATOR . 'dev');
define('DESTINATION_DIR', __DIR__ . DIRECTORY_SEPARATOR . 'prod');

define('OPENGRAPH_TAGS_SOURCE_FILE', SOURCE_DIR . DIRECTORY_SEPARATOR . '_opengraph-tags.html');

////////////////////////////////////////////////////////////////////////////////
// Copy assets

echo "Copying assets...\n";

$filesToCopy = [
    'apple-touch-icon.png',
    'favicon.ico',
    'favicon.svg',
    'favicon-96x96.png',
    'favicon-192x192.png',
    'favicon-512x512.png',
    'manifest.json',
    'og-image.png',
];
foreach ($filesToCopy as $filename) {
    copy(SOURCE_DIR . DIRECTORY_SEPARATOR . $filename, DESTINATION_DIR . DIRECTORY_SEPARATOR . $filename);
}


////////////////////////////////////////////////////////////////////////////////
// Minify the CSS

echo "Minifying CSS...\n";

$cssMinifier = new Minify\CSS(SOURCE_DIR . DIRECTORY_SEPARATOR . 'style.css');
$cssMinifier->minify(DESTINATION_DIR . DIRECTORY_SEPARATOR . 'style.css');


////////////////////////////////////////////////////////////////////////////////
// Minify the JS

echo "Minifying JavaScript...\n";

$jsMinifier = new Minify\JS();

$htmlDocument = HTMLDocument::createFromFile(SOURCE_DIR . DIRECTORY_SEPARATOR . 'index.html');
$xpath = new XPath($htmlDocument);
$xpath->registerNamespace('xhtml', 'http://www.w3.org/1999/xhtml');
// ↪ Technical requirement for the XPath query (Our markup is actually just HTML5).

foreach ($xpath->query('//xhtml:script[@src]') as $node) {
    /** @var Element $node */
    
    /** @var Attr */
    $srcAttribute = $node->attributes->getNamedItem('src');
    $scriptUrlComponents = parse_url($srcAttribute->nodeValue);
    if (
        !isset($scriptUrlComponents['scheme']) // This is a local path (not an external URL)
        && file_exists(SOURCE_DIR . DIRECTORY_SEPARATOR . $srcAttribute->nodeValue)
    ) {
        $jsMinifier->add(SOURCE_DIR . DIRECTORY_SEPARATOR . $srcAttribute->nodeValue);
    }
}

$jsMinifier->minify(DESTINATION_DIR . DIRECTORY_SEPARATOR . 'main.js');
// Merging all JS files into a single one is the most important performance optimization here:
// It means fewer network requests.

// Also minify the service worker:
$serviceWorkerMinifier = new Minify\JS(SOURCE_DIR . DIRECTORY_SEPARATOR . 'service-worker.js');
$serviceWorkerMinifier->minify(DESTINATION_DIR . DIRECTORY_SEPARATOR . 'service-worker.js');


////////////////////////////////////////////////////////////////////////////////
// Build the production HTML

function insertOpenGraphTags(HTMLDocument $htmlDocument)
{
    if (file_exists(OPENGRAPH_TAGS_SOURCE_FILE)) {
        $opengraphTagsStr = file_get_contents(OPENGRAPH_TAGS_SOURCE_FILE);    
    
        $xpath = new XPath($htmlDocument);
        $xpath->registerNamespace('xhtml', 'http://www.w3.org/1999/xhtml');
        
        /** @var Element */
        $headTag = $xpath->query('//xhtml:head')->item(0);
        $headTag->innerHTML .= $opengraphTagsStr;
    }
}

function fixJsPaths(HTMLDocument $htmlDocument)
{
    $xpath = new XPath($htmlDocument);
    $xpath->registerNamespace('xhtml', 'http://www.w3.org/1999/xhtml');
    // No matter what it looks like, it's just HTML5.
    
    foreach ($xpath->query('//xhtml:script[@src]') as $node) {
        /** @var Element $node */
        
        if ($node->className === 'dev-only') {
            $node->parentNode->removeChild($node);
            continue;
        }
    }
}

function clearCommentNodes(Node $node)
{
    foreach ($node->childNodes as $childNode) {
        if ($childNode->nodeType === XML_COMMENT_NODE) {
            $node->removeChild($childNode);
            continue;
        }
        
        clearCommentNodes($childNode);
    }
}

function collapseWhitespace(Node $node)
{
    if ($node->nodeName === 'PRE') {
        return;
    }
    
    foreach ($node->childNodes as $childNode) {
        if ($childNode->nodeType === XML_TEXT_NODE) {
            // Warning: We'll have to remove this if we ever use CSS rules like:
            //     white-space-collapse: preserve;
            //     white-space-collapse: preserve-breaks;
            //     white-space-collapse: preserve-spaces;
            //     white-space-collapse: break-spaces;
            
            // Collapse "horizontal whitespace" but not newlines
            //$childNode->textContent = preg_replace('/[ \t]+/', ' ', $childNode->textContent);
            
            // Collapse all whitespace (keep 1 space, not 0)
            $childNode->textContent = preg_replace('/\s+/', ' ', $childNode->textContent);
            continue;
        }
        
        collapseWhitespace($childNode);
    }
}

echo "Minifying HTML...\n";
$htmlDocument = HTMLDocument::createFromFile(SOURCE_DIR . DIRECTORY_SEPARATOR . 'index.html');
// Warning: Passing HTML_NO_DEFAULT_NS to createFromFile() has nasty side effects (e.g. "<br/>" becomes "<br><br>").
insertOpenGraphTags($htmlDocument);
fixJsPaths($htmlDocument);
clearCommentNodes($htmlDocument->getRootNode());
collapseWhitespace($htmlDocument->getRootNode());
$htmlDocument->saveHtmlFile(DESTINATION_DIR . DIRECTORY_SEPARATOR . 'index.html');

echo "Done.\n";