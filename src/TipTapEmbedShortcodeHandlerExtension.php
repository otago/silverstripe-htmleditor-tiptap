<?php

namespace OP;

use SilverStripe\Core\Convert;
use SilverStripe\Core\Extension;
use SilverStripe\Dev\Debug;

/**
 * converts <embed> to <iframe> to emebed videos for youtube etc.
 * 
 * to make it so we can edit it, we'll need to do the opposite conversion as well, from <iframe> back to <embed>.
 * see TipTapFieldExtension to do this.
 */
class TipTapEmbedShortcodeHandlerExtension extends Extension
{
    /**
     * Render [embed], [embeed], or [tiptap_embed] shortcodes for frontend output.
     *
     * @param array<string, mixed> $arguments
     */
    public function onBeforeParse(string &$content): string
    {
        // works on front, but not in backend. todo: fix this.
        //return $content;
        $html = preg_replace_callback(
            '/<embed\b([^>]*)><\/embed>/i',
            function ($matches) {
                $attributes = $matches[1];

                if (!preg_match('/\bdata-id=["\']([a-zA-Z0-9_-]{11})["\']/', $attributes, $idMatch)) {
                    return $matches[0];
                }

                $videoId = $idMatch[1];

                preg_match('/\bwidth=["\'](\d+)["\']/', $attributes, $widthMatch);
                preg_match('/\bheight=["\'](\d+)["\']/', $attributes, $heightMatch);
                preg_match('/\bstyle=["\']([^"\']*)["\']/', $attributes, $styleMatch);
                preg_match('/\bsrc=["\']([^"\']*)["\']/', $attributes, $srcMatch);
                

                $width = $widthMatch[1] ?? '640';
                $height = $heightMatch[1] ?? '480';
                $style = $styleMatch[1] ?? '';
                $src = $srcMatch[1] ?? '';

                return sprintf(
                    str_replace(["\r\n", "\n", "\r"], '', '<iframe 
                        width="%s"
                        height="%s" 
                        src="https://www.youtube-nocookie.com/embed/%s" 
                        data-id="%s"
                        data-style="%s"
                        data-src="%s"
                        title="YouTube video"
                        frameborder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerpolicy="strict-origin-when-cross-origin" 
                        allowfullscreen></iframe>'),
                    $width,
                    $height,
                    htmlspecialchars($videoId, ENT_QUOTES, 'UTF-8'),
                    htmlspecialchars($videoId, ENT_QUOTES, 'UTF-8'),
                    htmlspecialchars($style, ENT_QUOTES, 'UTF-8'),
                    htmlspecialchars($src, ENT_QUOTES, 'UTF-8')
                );
            },
            $content
        );
        $content = $html;
        return $content;
    }

    public static function iframetoembed(string $content): string
    {
        $html = preg_replace_callback(
            '/<iframe\b([^>]*)><\/iframe>/i',
            function ($matches) {
                $attributes = $matches[1];

                if (!preg_match('/\bdata-id=["\']([a-zA-Z0-9_-]{11})["\']/', $attributes, $idMatch)) {
                    return $matches[0];
                }

                $videoId = $idMatch[1];

                preg_match('/\bwidth=["\'](\d+)["\']/', $attributes, $widthMatch);
                preg_match('/\bheight=["\'](\d+)["\']/', $attributes, $heightMatch);
                preg_match('/\bsrc=["\']([^"\']+)["\']/', $attributes, $srcMatch);
                preg_match('/\bstyle=["\']([^"\']+)["\']/', $attributes, $styleMatch);

                $width = $widthMatch[1] ?? '640';
                $height = $heightMatch[1] ?? '480';
                $src = $srcMatch[1] ?? '';
                $style = $styleMatch[1] ?? '';

                return sprintf(
                   str_replace(["\r\n", "\n", "\r"], '',  '<embed width="%s" 
                    height="%s" 
                    data-id="%s" 
                    src="%s" 
                    style="%s"></embed>'),
                    $width,
                    $height,
                    htmlspecialchars($videoId, ENT_QUOTES, 'UTF-8'),
                    htmlspecialchars($src, ENT_QUOTES, 'UTF-8'),
                    htmlspecialchars($style, ENT_QUOTES, 'UTF-8')
                );
            },
            $content
        );
        return $html;
    }
}
