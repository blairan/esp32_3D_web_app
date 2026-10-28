import {test} from 'node:test';
import assert from 'node:assert/strict';
import {articles,articleById,topicArticles} from './articles.ts';
test('all twenty-six topics, related articles and entry mappings resolve without duplicate IDs',()=>{
 assert.equal(articles.length,26);assert.equal(articleById.size,26);
 for(const id of Object.values(topicArticles))assert.ok(articleById.has(id),id);
 for(const article of articles)for(const id of article.related){assert.ok(articleById.has(id),id);assert.notEqual(id,article.id);}
});
test('every beginner article has explanations, bounded examples, practice and official sources',()=>{
 for(const article of articles){
  assert.ok(article.summary&&article.sections.length>=2&&article.mistakes.length>=2&&article.question&&article.limitation,article.id);
  assert.ok(article.example.split('\n').length<=8,article.id);
  assert.ok(!(article.example.includes('void loop')&&article.example.includes('digitalWrite')),article.id);
  assert.ok(article.references.length>0,article.id);
  for(const reference of article.references){const url=new URL(reference.url);assert.equal(url.protocol,'https:');assert.ok(['docs.arduino.cc','docs.espressif.com','learn.adafruit.com','github.com'].includes(url.hostname));}
 }
});
