<?php

namespace OP;

use SilverStripe\Admin\LeftAndMain;
use SilverStripe\Core\Config\Config;
use SilverStripe\Core\Extension;
use SilverStripe\Core\Manifest\ModuleResourceLoader;
use SilverStripe\Forms\HTMLEditor\HTMLEditorField;
use SilverStripe\View\Requirements;

/**
 * Loads configured TipTap extension scripts once per CMS request.
 */
class TipTapLeftAndMainExtension extends Extension
{
    /**
     * @var array<string, bool>
     */
    protected static $loadedAssets = [];

    /**
     * Ensure custom TipTap extension scripts are available in CMS context.
     */
    public function onAfterInit()
    {
        if (!$this->owner instanceof LeftAndMain) {
            return;
        }

        $config = Config::inst()->get(HTMLEditorField::class, 'tiptap_config') ?: [];
        $extensionPaths = $this->getExtensionPathsFromToolbar($config);

        if (empty($extensionPaths)) {
            return;
        }

        $resourceLoader = new ModuleResourceLoader();

        foreach ($extensionPaths as $path) {
            $resolvedPath = $resourceLoader->resolveURL($path);
            if (!$resolvedPath || isset(self::$loadedAssets[$resolvedPath])) {
                continue;
            }

            Requirements::javascript($resolvedPath);
            self::$loadedAssets[$resolvedPath] = true;
        }

        TipTapFieldExtension::markGlobalExtensionAssetsLoaded();
    }

    /**
     * Pull extension script paths from toolbar config.
     *
     * @param array<string, mixed> $config
     * @return array<int, string>
     */
    protected function getExtensionPathsFromToolbar(array $config): array
    {
        if (!isset($config['toolbar']) || !is_array($config['toolbar'])) {
            return [];
        }

        $paths = [];

        foreach ($config['toolbar'] as $item) {
            if (!is_array($item)) {
                continue;
            }

            // Top-level extension button definition: ['name' => 'module: path.js']
            if (!array_key_exists('dropdown', $item)) {
                foreach ($item as $extensionPath) {
                    if (is_string($extensionPath)) {
                        $paths[] = $extensionPath;
                    }
                }
                continue;
            }

            // Dropdown extension definitions inside actions.
            if (!isset($item['actions']) || !is_array($item['actions'])) {
                continue;
            }

            foreach ($item['actions'] as $action) {
                if (!is_array($action)) {
                    continue;
                }

                foreach ($action as $extensionPath) {
                    if (is_string($extensionPath)) {
                        $paths[] = $extensionPath;
                    }
                }
            }
        }

        return array_values(array_unique($paths));
    }
}
