<?php

namespace OP;

use SilverStripe\Control\Controller;
use SilverStripe\Control\HTTPRequest;
use SilverStripe\Control\HTTPResponse;
use SilverStripe\ORM\DB;
use SilverStripe\ORM\Queries\SQLSelect;
use SilverStripe\Security\Permission;
use SilverStripe\Security\Security;

/**
 * Controller for providing page tree data via AJAX
 */
class PageTreeController extends Controller
{

    /**
     * Allowed actions
     */
    private static $allowed_actions = [
        'json'
    ];

    /**
     * Get page tree as JSON
     */
    public function json(HTTPRequest $request)
    {
        if (!Security::getCurrentUser() || !Permission::check('CMS_ACCESS_CMSMain')) {
            $response = HTTPResponse::create();
            $response->setStatusCode(403);
            $response->setBody(json_encode([
                'success' => false,
                'error' => 'Forbidden',
                'message' => 'You do not have permission to access this resource.'
            ]));
            return $response;
        }

        // Set JSON response header
        $response = HTTPResponse::create();
        $response->addHeader('Content-Type', 'application/json');
        $response->addHeader('Access-Control-Allow-Origin', '*');
        $response->addHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        $response->addHeader('Access-Control-Allow-Headers', 'Content-Type');

        try {
            // Get pages using SQLSelect with JOIN for better performance
            $pages = $this->getPagesSql();

            error_log("Found " . count($pages) . " pages");

            $pageTree = $this->buildPageTree($pages);

            $response->setBody(json_encode([
                'success' => true,
                'data' => $pageTree,
                'count' => count($pageTree)
            ]));
        } catch (\Exception $e) {
            error_log("Error in getPageTreeJson: " . $e->getMessage());
            $response->setStatusCode(500);
            $response->setBody(json_encode([
                'success' => false,
                'error' => 'Failed to load page tree',
                'message' => $e->getMessage()
            ]));
        }

        return $response;
    }


    /**
     * Get pages using SQLSelect with JOIN for better performance
     */
    private function getPagesSql()
    {
        try {
            // Join SiteTree_Live and SiteTree to get both published and draft pages
            // Prioritize published content where available
            $query = SQLSelect::create()
                ->setSelect([
                    'COALESCE(live.ID, draft.ID) AS ID',
                    'COALESCE(live.Title, draft.Title) AS Title',
                    'COALESCE(live.MenuTitle, draft.MenuTitle) AS MenuTitle',
                    'COALESCE(live.URLSegment, draft.URLSegment) AS URLSegment',
                    'COALESCE(live.ParentID, draft.ParentID) AS ParentID',
                    'COALESCE(live.Sort, draft.Sort) AS Sort'
                ])
                ->setFrom('SiteTree draft')
                ->addLeftJoin('SiteTree_Live', 'live.ID = draft.ID', 'live')
                ->setOrderBy('COALESCE(live.Sort, draft.Sort)', 'ASC');

            $result = $query->execute();
            $pages = [];

            // Build array with ID as index for efficient tree building
            foreach ($result as $row) {
                $pages[$row['ID']] = [
                    'id' => (int)$row['ID'],
                    'title' => $row['Title'],
                    'menuTitle' => $row['MenuTitle'] ?: $row['Title'],
                    'urlSegment' => $row['URLSegment'],
                    'parentId' => (int)$row['ParentID'],
                    'sort' => (int)$row['Sort'],
                    'children' => []
                ];
            }

            return $pages;
        } catch (Exception $e) {
            error_log("Error in getPagesSql: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Build hierarchical page tree structure
     */
    private function buildPageTree($pages)
    {
        $tree = [];

        // Build hierarchy using the indexed array
        foreach ($pages as $id => $pageData) {
            if ($pageData['parentId'] == 0) {
                // Root level page
                $tree[] = &$pages[$id];
            } else {
                // Child page - add to parent's children array
                if (isset($pages[$pageData['parentId']])) {
                    $pages[$pageData['parentId']]['children'][] = &$pages[$id];
                }
            }
        }

        return $tree;
    }
}
