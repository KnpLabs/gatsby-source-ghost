const testUtils = require('./utils');
const ContentAPI = require('../content-api');
const gatsbyNode = require('../gatsby-node');

describe('Basic Functionality', function () {
    beforeEach(function () {
        return sinon.replace(ContentAPI, 'configure', testUtils.MockContentAPI);
    });

    afterEach(function () {
        return sinon.restore();
    });

    it('Gatsby Node is able to create real nodes', function (done) {
        const createNode = sinon.stub();

        gatsbyNode
            .sourceNodes({actions: {createNode}}, {})
            .then(() => {
                createNode.callCount.should.eql(8);

                const nodes = createNode.args.map(args => args[0]);
                const nodesByType = type => nodes.filter(n => n.internal && n.internal.type === type);

                // Check all expected node types are created
                nodesByType('GhostPost').length.should.eql(1);
                nodesByType('GhostPage').length.should.eql(1);
                nodesByType('GhostTag').length.should.eql(2);
                nodesByType('GhostAuthor').length.should.eql(2);
                nodesByType('GhostSettings').length.should.eql(1);
                nodesByType('GhostTiers').length.should.eql(1);

                // Validate node shape for each type
                nodesByType('GhostPost').forEach(n => n.should.be.a.ValidGatsbyNode('GhostPost'));
                nodesByType('GhostPage').forEach(n => n.should.be.a.ValidGatsbyNode('GhostPage'));
                nodesByType('GhostTag').forEach(n => n.should.be.a.ValidGatsbyNode('GhostTag'));
                nodesByType('GhostAuthor').forEach(n => n.should.be.a.ValidGatsbyNode('GhostAuthor'));
                nodesByType('GhostSettings').forEach(n => n.should.be.a.ValidGatsbyNode('GhostSettings'));
                nodesByType('GhostTiers').forEach(n => n.should.be.a.ValidGatsbyNode('GhostTiers'));

                done();
            })
            .catch(done);
    });
});

describe('Pagination', function () {
    afterEach(function () {
        return sinon.restore();
    });

    it('fetches all pages when the API returns multiple pages of posts', function (done) {
        const withMeta = (items, page, pages, total) => Object.assign(items, {
            meta: {pagination: {page, limit: 100, pages, total, next: page < pages ? page + 1 : null, prev: page > 1 ? page - 1 : null}}
        });

        // Two pages of posts: page 1 has 1 post, page 2 has another post
        const browsePosts = sinon.stub().callsFake(({page = 1}) => {
            if (page === 1) {
                return Promise.resolve(withMeta([{slug: 'post-1', tags: [], authors: []}], 1, 2, 2));
            }
            return Promise.resolve(withMeta([{slug: 'post-2', tags: [], authors: []}], 2, 2, 2));
        });

        const MockPaginatedAPI = function () {
            return {
                posts: {browse: browsePosts},
                pages: {browse: sinon.stub().resolves(withMeta([], 1, 1, 0))},
                tags: {browse: sinon.stub().resolves(withMeta([], 1, 1, 0))},
                authors: {browse: sinon.stub().resolves(withMeta([], 1, 1, 0))},
                settings: {browse: sinon.stub().resolves({codeinjection_styles: ''})},
                tiers: {browse: sinon.stub().resolves(withMeta([], 1, 1, 0))}
            };
        };

        sinon.replace(ContentAPI, 'configure', MockPaginatedAPI);

        const createNode = sinon.stub();

        gatsbyNode
            .sourceNodes({actions: {createNode}}, {})
            .then(() => {
                // Both pages of posts should have been fetched
                browsePosts.callCount.should.eql(2);

                const postNodes = createNode.args
                    .map(args => args[0])
                    .filter(node => node.internal && node.internal.type === 'GhostPost');

                postNodes.length.should.eql(2);
                postNodes[0].slug.should.eql('post-1');
                postNodes[1].slug.should.eql('post-2');

                done();
            })
            .catch(done);
    });
});
